import logging
import time
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Load .env.local FIRST (before importing anything that reads env at import time)
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")

from server.agent.bootstrap import run_bootstrap  # noqa: E402

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("genphone")

app = FastAPI(title="genphone")


class BootstrapRequest(BaseModel):
    message: str


@app.get("/healthz")
async def healthz():
    return {"ok": True}


@app.post("/api/bootstrap")
async def bootstrap_route(req: BootstrapRequest):
    if not req.message.strip():
        raise HTTPException(400, "message required")
    try:
        blob = await run_bootstrap(req.message)
    except Exception as e:
        log.exception("bootstrap failed")
        raise HTTPException(500, str(e)) from e

    return JSONResponse(
        {
            **blob.model_dump(),
            "id": str(uuid.uuid4()),
            "createdAt": int(time.time() * 1000),
        }
    )


# Static frontend (when dist/ exists from `vite build`)
DIST = ROOT / "dist"
if DIST.exists():
    assets_dir = DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        index = DIST / "index.html"
        if index.exists():
            return FileResponse(index)
        raise HTTPException(404, "build not found")
