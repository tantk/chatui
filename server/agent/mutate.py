"""Phase B mutate: take a chat message + current app state, run ADK agent,
return updated state + assistant reply."""

from __future__ import annotations
import copy
import json
import os
import re
import time
from typing import Any

# ADK env (must be set before any ADK import — bootstrap.py already does
# this at module import time, but ensure here too in case mutate is imported
# first).
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "false")
if api_key := os.environ.get("GEMINI_API_KEY"):
    os.environ.setdefault("GOOGLE_API_KEY", api_key)

from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from google.adk.tools import FunctionTool
from google.genai import types as genai_types

from .prompts import MUTATE_SYSTEM
from .schema import ToolDeclaration, WidgetNode
from server.obs.tracing import trace
from server.obs.budget import check as _budget_check, record as _budget_record

_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview")

_TYPE_MAP: dict[str, type] = {
    "string": str,
    "number": float,
    "integer": int,
    "boolean": bool,
    "object": dict,
    "array": list,
}


# --- JSON-Patch template interpreter -----------------------------------
# Patch templates can embed `{{argname}}` placeholders inside string values,
# which we substitute with the call's arguments before applying the patch.

# We intentionally use ``<<name>>`` rather than ``{{name}}`` because ADK's
# instruction template engine eagerly interprets any ``{...}`` block in the
# system prompt as a session-state variable reference and raises if the var
# is missing. ``<<name>>`` survives ADK's substitution pass so the agent can
# emit it verbatim into tool implementations.
_PLACEHOLDER_RE = re.compile(r"^<<(\w+)>>$")
_INLINE_RE = re.compile(r"<<(\w+)>>")


def _substitute(value: Any, args: dict[str, Any]) -> Any:
    """Recursively substitute ``{{argname}}`` placeholders in any JSON value.

    A whole-string placeholder (``"{{x}}"``) is replaced with the raw arg value
    (preserving its type — number, bool, list, etc.). An inline placeholder
    (``"Run on {{date}}"``) is stringified into the surrounding text.
    """
    if isinstance(value, str):
        m = _PLACEHOLDER_RE.match(value)
        if m:
            return args.get(m.group(1))

        def _repl(match: "re.Match[str]") -> str:
            v = args.get(match.group(1), "")
            return "" if v is None else str(v)

        return _INLINE_RE.sub(_repl, value)
    if isinstance(value, dict):
        return {k: _substitute(v, args) for k, v in value.items()}
    if isinstance(value, list):
        return [_substitute(v, args) for v in value]
    return value


def apply_template(
    impl: dict[str, Any],
    args: dict[str, Any],
    data: dict[str, Any],
) -> dict[str, Any]:
    """Apply a JSON-Patch-template tool implementation to ``data`` in place.

    Returns ``{"ok": True, "applied": N}`` on success, or
    ``{"ok": False, "error": "..."}`` on any failure.
    """
    if not isinstance(impl, dict) or impl.get("type") != "patch":
        return {"ok": False, "error": f"unsupported impl type: {impl.get('type') if isinstance(impl, dict) else type(impl).__name__}"}
    patches = impl.get("patches") or []
    if not isinstance(patches, list):
        return {"ok": False, "error": "patches must be a list"}

    applied = 0
    for raw in patches:
        try:
            p = _substitute(copy.deepcopy(raw), args)
            op = p.get("op")
            path = p.get("path", "")
            value = p.get("value")
            segs = [s for s in path.split("/") if s != ""]
            parent: Any = data
            for s in segs[:-1]:
                if isinstance(parent, list):
                    parent = parent[int(s)]
                else:
                    parent = parent.get(s) if hasattr(parent, "get") else parent[s]
            last = segs[-1] if segs else None

            if op in ("replace", "add"):
                if last is None:
                    if isinstance(value, dict):
                        data.clear()
                        data.update(value)
                    else:
                        return {"ok": False, "error": "root replace requires object"}
                elif isinstance(parent, list):
                    idx = int(last) if last != "-" else len(parent)
                    if op == "replace":
                        parent[idx] = value
                    else:
                        parent.insert(idx, value)
                else:
                    parent[last] = value
            elif op == "remove":
                if last is None:
                    return {"ok": False, "error": "remove requires path"}
                if isinstance(parent, list):
                    del parent[int(last)]
                else:
                    parent.pop(last, None)
            else:
                return {"ok": False, "error": f"unsupported op: {op}"}
            applied += 1
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": f"patch failed: {e}", "applied": applied}

    return {"ok": True, "applied": applied}


def _make_adk_tool(decl: ToolDeclaration, state_holder: dict[str, Any]) -> FunctionTool:
    """Build an ADK FunctionTool that applies a declarative JSON-Patch template.

    The agent declared this tool at bootstrap time, complete with parameter
    schema and a patch-template implementation. Calling the tool substitutes
    the call's args into the template and applies the resulting patches to
    ``state_holder['data']``.

    Because ADK introspects the function via ``inspect.signature``, a plain
    ``**kwargs`` function would have its parameters dropped. So we generate
    a function with a real positional/keyword signature using ``exec``.
    """
    impl = decl.implementation.model_dump()
    properties: dict[str, dict[str, Any]] = decl.parameters.properties or {}
    required_set: set[str] = set(decl.parameters.required or [])

    def runner(kwargs: dict[str, Any]) -> dict[str, Any]:
        cleaned = {k: v for k, v in kwargs.items() if v is not None}
        try:
            return apply_template(impl, cleaned, state_holder["data"])
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": str(e)}

    # Build signature parts: required first, then optional with =None.
    sig_parts: list[str] = []
    locals_dict: dict[str, Any] = {"_runner": runner}
    ordered = sorted(
        properties.items(), key=lambda kv: 0 if kv[0] in required_set else 1
    )
    for pname, schema in ordered:
        py_type = _TYPE_MAP.get(schema.get("type", "string"), str)
        type_name = py_type.__name__
        if pname in required_set:
            sig_parts.append(f"{pname}: {type_name}")
        else:
            sig_parts.append(f"{pname}: {type_name} = None")

    safe_doc = (decl.description or "").replace('"""', "'''")
    src = (
        f"def {decl.name}({', '.join(sig_parts)}) -> dict:\n"
        f'    """{safe_doc}"""\n'
        f"    return _runner(locals())\n"
    )
    exec(src, locals_dict)  # noqa: S102
    fn = locals_dict[decl.name]
    return FunctionTool(func=fn)


def _make_edit_layout_tool(state_holder: dict[str, Any]) -> FunctionTool:
    """Universal tool: lets the agent replace the app's UI tree.

    Accepts the new tree as a JSON string (safer than dict — Gemini/ADK can be
    finicky about coercing dict args). Validates strictly against WidgetNode
    before mutating state.
    """

    def editLayout(newTreeJson: str) -> dict:
        """Replace the app's UI tree with a new tree.

        Args:
            newTreeJson: The COMPLETE new UI tree as a JSON string, matching the
                WidgetNode schema. Must use only widget types from the catalog.
                Keep bindings consistent with the existing data keys.
        """
        try:
            parsed = json.loads(newTreeJson)
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": f"invalid JSON: {e}"}
        try:
            validated = WidgetNode.model_validate(parsed)
            state_holder["tree"] = validated.model_dump(exclude_none=True)
            return {"ok": True, "message": "tree updated"}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": f"tree validation failed: {e}"}

    return FunctionTool(func=editLayout)


def _make_apply_data_patch_tool(state_holder: dict[str, Any]) -> FunctionTool:
    """Universal tool: lets the agent surgically update any data field via JSON Patch."""

    def apply_data_patch(patchesJson: str) -> dict:
        """Apply a JSON Patch to the app's data. Use this to keep derived stats
        consistent (e.g., after addRun, recompute totalMiles).

        Args:
            patchesJson: A JSON-stringified array of RFC-6902 patches, e.g.
                '[{"op":"replace","path":"/totalMiles","value":42}]'.
                Supported ops: replace, add, remove. Paths use JSON Pointer syntax
                (/foo/bar/0/baz).
        """
        try:
            patches = json.loads(patchesJson)
            if not isinstance(patches, list):
                return {"ok": False, "error": "patchesJson must be a JSON array"}

            data = state_holder["data"]
            applied = 0
            for p in patches:
                op = p.get("op")
                path = p.get("path", "")
                value = p.get("value")
                segs = [s for s in path.split("/") if s != ""]
                # Walk to parent
                parent = data
                for s in segs[:-1]:
                    if isinstance(parent, list):
                        parent = parent[int(s)]
                    else:
                        parent = parent.get(s) if hasattr(parent, "get") else parent[s]
                last = segs[-1] if segs else None

                if op == "replace" or op == "add":
                    if last is None:
                        # Replace whole data
                        if isinstance(value, dict):
                            state_holder["data"] = value
                        else:
                            return {"ok": False, "error": "root replace requires object"}
                    elif isinstance(parent, list):
                        idx = int(last) if last != "-" else len(parent)
                        if op == "replace":
                            parent[idx] = value
                        else:
                            parent.insert(idx, value)
                    else:
                        parent[last] = value
                elif op == "remove":
                    if isinstance(parent, list):
                        del parent[int(last)]
                    else:
                        parent.pop(last, None)
                else:
                    return {"ok": False, "error": f"unsupported op: {op}"}
                applied += 1

            return {"ok": True, "applied": applied}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": str(e)}

    return FunctionTool(func=apply_data_patch)


@trace("mutate")
async def run_mutate(
    *,
    message: str,
    tools: list[ToolDeclaration],
    data: dict[str, Any],
    tree: dict[str, Any],
    chat_history: list[dict[str, Any]],
) -> dict[str, Any]:
    """Returns {"data": <new>, "tree": <new>, "reply": <text>, "history": <new>}."""
    # Budget guard before making the call.
    _budget_check()

    # Working copy so failures don't corrupt caller's data.
    state_holder: dict[str, Any] = {
        "data": json.loads(json.dumps(data)),
        "tree": json.loads(json.dumps(tree)),
    }

    adk_tools = [_make_adk_tool(t, state_holder) for t in tools]
    adk_tools.append(_make_edit_layout_tool(state_holder))
    adk_tools.append(_make_apply_data_patch_tool(state_holder))

    instruction = (
        MUTATE_SYSTEM
        + "\n\n# Current app data:\n"
        + json.dumps(state_holder["data"], indent=2)
        + "\n\n# Current UI tree:\n"
        + json.dumps(state_holder["tree"], indent=2)
    )

    agent = Agent(
        name="mutate",
        model=_MODEL,
        instruction=instruction,
        tools=adk_tools,
    )
    runner = InMemoryRunner(agent=agent, app_name="genphone")

    user_id = "user-mutate"
    session = await runner.session_service.create_session(
        app_name="genphone", user_id=user_id
    )

    text_chunks: list[str] = []
    input_tokens = 0
    output_tokens = 0
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=genai_types.Content(
            role="user", parts=[genai_types.Part(text=message)]
        ),
    ):
        um = getattr(event, "usage_metadata", None)
        if um:
            input_tokens = max(
                input_tokens, getattr(um, "prompt_token_count", 0) or 0
            )
            output_tokens = max(
                output_tokens, getattr(um, "candidates_token_count", 0) or 0
            )
        if not event.is_final_response():
            continue
        if event.content and event.content.parts:
            for p in event.content.parts:
                if getattr(p, "text", None):
                    text_chunks.append(p.text)

    try:
        _budget_record(
            model=_MODEL,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
    except Exception:
        pass

    reply = "".join(text_chunks).strip() or "(done)"

    new_history = list(chat_history) + [
        {"role": "user", "content": message, "ts": int(time.time() * 1000)},
        {"role": "assistant", "content": reply, "ts": int(time.time() * 1000)},
    ]

    return {
        "data": state_holder["data"],
        "tree": state_holder["tree"],
        "reply": reply,
        "history": new_history,
    }
