"""Daytona sandbox wrapper.

Adapted to daytona SDK 0.173.0:
- AsyncDaytona(DaytonaConfig(api_key=...))
- await client.create(CreateSandboxFromSnapshotParams(language='python'))
- sandbox.fs.upload_file(src=bytes, dst=path)
- sandbox.process.exec(command, cwd=..., timeout=...)
- sandbox.get_preview_link(port).url
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass

import httpx

log = logging.getLogger("genphone.sandbox")


@dataclass
class SandboxHandle:
    id: str
    url: str


def _build_client():
    """Build an AsyncDaytona client. Lazy import so missing SDK doesn't break boot."""
    from daytona import AsyncDaytona, DaytonaConfig  # type: ignore

    api_key = os.environ.get("DAYTONA_API_KEY")
    if not api_key:
        raise RuntimeError("DAYTONA_API_KEY not set")
    return AsyncDaytona(DaytonaConfig(api_key=api_key))


async def provision_python_service(code: str) -> SandboxHandle:
    """Create a sandbox, upload app.py, start uvicorn, return public URL.

    Raises on any failure. Caller is responsible for catching.
    """
    from daytona import CreateSandboxFromSnapshotParams  # type: ignore

    client = _build_client()
    sandbox = None
    try:
        log.info("creating Daytona sandbox (language=python)")
        sandbox = await client.create(
            CreateSandboxFromSnapshotParams(language="python", public=True),
            timeout=120,
        )
        sandbox_id = getattr(sandbox, "id", "?")
        log.info("sandbox %s created, uploading app.py", sandbox_id)

        # Upload the app file. Order is (src, dst).
        await sandbox.fs.upload_file(code.encode("utf-8"), "/home/daytona/app.py")

        log.info("sandbox %s installing fastapi+uvicorn", sandbox_id)
        install = await sandbox.process.exec(
            "pip install --quiet fastapi uvicorn",
            cwd="/home/daytona",
            timeout=120,
        )
        ec = getattr(install, "exit_code", None)
        if ec not in (0, None):
            log.warning(
                "sandbox %s pip install exit=%s output=%s",
                sandbox_id,
                ec,
                getattr(install, "result", "")[:500],
            )

        log.info("sandbox %s starting uvicorn in background", sandbox_id)
        await sandbox.process.exec(
            "nohup python -m uvicorn app:app --host 0.0.0.0 --port 8000 "
            "> /tmp/svc.log 2>&1 &",
            cwd="/home/daytona",
            timeout=20,
        )

        # Get public URL
        link = await sandbox.get_preview_link(8000)
        url = getattr(link, "url", None) or str(link)
        token = getattr(link, "token", None)
        log.info("sandbox %s preview url=%s", sandbox_id, url)

        # Health check loop
        headers = {"x-daytona-preview-token": token} if token else {}
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as http:
            for i in range(30):
                try:
                    r = await http.get(f"{url}/health", headers=headers)
                    if r.status_code == 200:
                        log.info("sandbox %s healthy after %ds", sandbox_id, i)
                        # Embed token into URL as query param so frontend can fetch
                        # without needing to pass headers.
                        final_url = url
                        if token:
                            sep = "&" if "?" in url else "?"
                            final_url = f"{url}{sep}preview_token={token}"
                        return SandboxHandle(id=sandbox_id, url=final_url)
                except Exception as e:  # noqa: BLE001
                    if i % 5 == 0:
                        log.debug("sandbox %s health probe %d failed: %s", sandbox_id, i, e)
                await asyncio.sleep(1.0)

        raise RuntimeError(f"sandbox health check timed out for {url}")
    finally:
        try:
            await client.close()
        except Exception:  # noqa: BLE001
            pass
