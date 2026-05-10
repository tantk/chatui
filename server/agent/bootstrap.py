"""Phase A bootstrap: take a user message, return a structured app blob.

Uses Google ADK with AI Studio (NOT Vertex AI). If ADK insists on Vertex
AI or fails at import time, fall back to raw google-genai.
"""

from __future__ import annotations

import os

from .prompts import B3_MARATHON_BACKEND, BOOTSTRAP_SYSTEM
from .schema import BootstrapResponse
from server.obs.tracing import trace

# Set AI-Studio mode for ADK BEFORE importing anything from ADK.
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "false")
# Mirror our app's GEMINI_API_KEY into the variable ADK reads.
if api_key := os.environ.get("GEMINI_API_KEY"):
    os.environ.setdefault("GOOGLE_API_KEY", api_key)


# --- ADK path -----------------------------------------------------------
_USE_ADK = True
try:
    from google.adk.agents import Agent  # type: ignore
    from google.adk.runners import InMemoryRunner  # type: ignore
    from google.genai import types as genai_types  # type: ignore
except ImportError:
    _USE_ADK = False


_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview")


@trace("bootstrap")
async def run_bootstrap(user_message: str) -> BootstrapResponse:
    if _USE_ADK:
        blob = await _run_with_adk(user_message)
    else:
        blob = await _run_with_genai(user_message)

    # B3: optionally generate a Python backend for marathon apps.
    if blob.appType == "marathon":
        blob.backendCode = await _generate_marathon_backend()

    return blob


async def _generate_marathon_backend() -> str | None:
    """Best-effort. Returns None on any failure — never break B1."""
    if os.environ.get("B3_ENABLED", "0") != "1":
        return None
    try:
        if _USE_ADK:
            agent = Agent(
                name="b3_codegen",
                model=_MODEL,
                instruction=B3_MARATHON_BACKEND,
            )
            runner = InMemoryRunner(agent=agent, app_name="genphone-b3")
            user_id = "b3-codegen"
            session = await runner.session_service.create_session(
                app_name="genphone-b3", user_id=user_id
            )
            chunks: list[str] = []
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session.id,
                new_message=genai_types.Content(
                    role="user", parts=[genai_types.Part(text="generate")]
                ),
            ):
                if not event.is_final_response():
                    continue
                if event.content and event.content.parts:
                    for p in event.content.parts:
                        if getattr(p, "text", None):
                            chunks.append(p.text)
            raw = "".join(chunks).strip()
        else:
            from google import genai  # type: ignore
            client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
            response = await client.aio.models.generate_content(
                model=_MODEL,
                contents="generate",
                config={"system_instruction": B3_MARATHON_BACKEND},
            )
            raw = (response.text or "").strip()

        raw = _strip_fences(raw)
        # Sanity check: should mention FastAPI
        if "FastAPI" not in raw and "fastapi" not in raw:
            return None
        return raw
    except Exception:
        return None


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        # drop opening fence (with optional language tag)
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
    return raw.strip()


async def _run_with_adk(user_message: str) -> BootstrapResponse:
    """Use ADK's LlmAgent for the one-shot bootstrap call."""
    agent = Agent(
        name="bootstrap",
        model=_MODEL,
        instruction=BOOTSTRAP_SYSTEM,
    )
    runner = InMemoryRunner(agent=agent, app_name="genphone")

    user_id = "user-bootstrap"
    session = await runner.session_service.create_session(
        app_name="genphone", user_id=user_id
    )

    text_chunks: list[str] = []
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=genai_types.Content(
            role="user", parts=[genai_types.Part(text=user_message)]
        ),
    ):
        if not event.is_final_response():
            continue
        if event.content and event.content.parts:
            for p in event.content.parts:
                t = getattr(p, "text", None)
                if t:
                    text_chunks.append(t)

    raw = _strip_fences("".join(text_chunks))
    return BootstrapResponse.model_validate_json(raw)


# --- Fallback: raw google-genai SDK -------------------------------------

async def _run_with_genai(user_message: str) -> BootstrapResponse:
    from google import genai  # type: ignore

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    response = await client.aio.models.generate_content(
        model=_MODEL,
        contents=user_message,
        config={
            "system_instruction": BOOTSTRAP_SYSTEM,
            "response_mime_type": "application/json",
        },
    )
    text = response.text or ""
    return BootstrapResponse.model_validate_json(_strip_fences(text))
