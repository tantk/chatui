"""Phase B mutate: take a chat message + current app state, run ADK agent,
return updated state + assistant reply."""

from __future__ import annotations
import json
import os
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
from .schema import ToolDeclaration
from .tools.handlers import REGISTRY, dispatch
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


def _make_adk_tool(decl: ToolDeclaration, state_holder: dict[str, Any]) -> FunctionTool:
    """Build an ADK FunctionTool whose execution dispatches into our pure
    handler and mutates the shared state_holder['data'] dict.

    Because ADK introspects the function via ``inspect.signature``, a plain
    ``**kwargs`` function would have its parameters dropped. So we generate
    a function with a real positional/keyword signature using ``exec``.
    """
    handler_name = decl.handler
    properties: dict[str, dict[str, Any]] = decl.parameters.properties or {}
    required_set: set[str] = set(decl.parameters.required or [])

    def impl(kwargs: dict[str, Any]) -> dict[str, Any]:
        # Strip None defaults that came from optional params being unset.
        cleaned = {k: v for k, v in kwargs.items() if v is not None}
        try:
            return dispatch(handler_name, cleaned, state_holder["data"])
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": str(e)}

    # Build signature parts: required first, then optional with =None.
    sig_parts: list[str] = []
    locals_dict: dict[str, Any] = {"_impl": impl}
    for pname, schema in properties.items():
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
        f"    return _impl(locals())\n"
    )
    exec(src, locals_dict)  # noqa: S102
    fn = locals_dict[decl.name]
    return FunctionTool(func=fn)


@trace("mutate")
async def run_mutate(
    *,
    message: str,
    tools: list[ToolDeclaration],
    data: dict[str, Any],
    chat_history: list[dict[str, Any]],
) -> dict[str, Any]:
    """Returns {"data": <new>, "reply": <text>, "history": <new>}."""
    # Budget guard before making the call.
    _budget_check()

    # Working copy so failures don't corrupt caller's data.
    state_holder: dict[str, Any] = {"data": json.loads(json.dumps(data))}

    # Validate every declared handler exists in registry.
    for t in tools:
        if t.handler not in REGISTRY:
            raise ValueError(f"declared tool has unknown handler: {t.handler}")

    adk_tools = [_make_adk_tool(t, state_holder) for t in tools]

    instruction = (
        MUTATE_SYSTEM
        + "\n\n# Current app data:\n"
        + json.dumps(state_holder["data"], indent=2)
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
        "reply": reply,
        "history": new_history,
    }
