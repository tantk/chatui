"""LangSmith tracing wrappers."""

from __future__ import annotations

import os
from typing import Any, Awaitable, Callable, TypeVar

T = TypeVar("T")
_enabled = bool(os.environ.get("LANGSMITH_API_KEY"))

if _enabled:
    os.environ.setdefault("LANGSMITH_TRACING", "true")
    os.environ.setdefault(
        "LANGSMITH_PROJECT",
        os.environ.get("LANGSMITH_PROJECT", "genphone-hackathon"),
    )


def trace(name: str) -> Callable[[Callable[..., Awaitable[T]]], Callable[..., Awaitable[T]]]:
    """Wrap an async function with LangSmith tracing if enabled, else passthrough."""

    def decorator(fn: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        if not _enabled:
            return fn
        try:
            from langsmith import traceable  # type: ignore

            return traceable(  # type: ignore[no-any-return]
                name=name, project_name=os.environ["LANGSMITH_PROJECT"]
            )(fn)
        except ImportError:
            return fn
        except Exception:
            # Never let tracing break the request path.
            return fn

    return decorator


def is_enabled() -> bool:
    return _enabled


__all__ = ["trace", "is_enabled"]
