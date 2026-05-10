"""In-memory provisioning state machine. Maps app id → status."""

from __future__ import annotations

import asyncio
import logging
from typing import Literal, TypedDict

from .daytona import provision_python_service

log = logging.getLogger("genphone.provisioner")


class StateProvisioning(TypedDict):
    state: Literal["provisioning"]


class StateReady(TypedDict):
    state: Literal["ready"]
    url: str


class StateFailed(TypedDict):
    state: Literal["failed"]
    error: str


Status = StateProvisioning | StateReady | StateFailed

_STATUS: dict[str, Status] = {}


def start(app_id: str, code: str) -> None:
    """Fire and forget — kicks off async provisioning."""
    _STATUS[app_id] = {"state": "provisioning"}
    asyncio.create_task(_provision(app_id, code))


async def _provision(app_id: str, code: str) -> None:
    try:
        handle = await provision_python_service(code)
        _STATUS[app_id] = {"state": "ready", "url": handle.url}
        log.info("sandbox %s ready: %s", app_id, handle.url)
    except Exception as e:  # noqa: BLE001
        log.exception("sandbox %s failed", app_id)
        _STATUS[app_id] = {"state": "failed", "error": str(e)}


def get(app_id: str) -> Status:
    return _STATUS.get(  # type: ignore[return-value]
        app_id, {"state": "failed", "error": "unknown app id"}
    )
