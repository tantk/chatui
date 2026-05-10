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
from server.agent.mutate import run_mutate  # noqa: E402
from server.agent.schema import ToolDeclaration  # noqa: E402
from server.obs.budget import BudgetExceeded, snapshot as _budget_snapshot  # noqa: E402

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
    except BudgetExceeded as e:
        raise HTTPException(429, str(e)) from e
    except Exception as e:
        log.exception("bootstrap failed")
        raise HTTPException(500, str(e)) from e

    app_id = str(uuid.uuid4())
    payload = {
        **blob.model_dump(),
        "id": app_id,
        "createdAt": int(time.time() * 1000),
        "backendStatus": "none",
    }

    if blob.backendCode:
        try:
            from server.sandbox.provisioner import start as start_provision

            start_provision(app_id, blob.backendCode)
            payload["backendStatus"] = "provisioning"
        except Exception:  # noqa: BLE001
            log.exception("provisioner kickoff failed; degrading to seed-only")

    return JSONResponse(payload)


@app.get("/api/app/{app_id}/backend")
async def backend_status(app_id: str):
    from server.sandbox.provisioner import get

    return get(app_id)


class ChatMessage(BaseModel):
    role: str
    content: str
    ts: int


class MutateRequest(BaseModel):
    message: str
    tools: list[dict]  # validated as ToolDeclaration on the way in
    data: dict
    tree: dict
    chatHistory: list[ChatMessage] = []


@app.post("/api/mutate")
async def mutate_route(req: MutateRequest):
    if not req.message.strip():
        raise HTTPException(400, "message required")
    if not req.tools:
        raise HTTPException(400, "tools required")
    try:
        decls = [ToolDeclaration.model_validate(t) for t in req.tools]
        result = await run_mutate(
            message=req.message,
            tools=decls,
            data=req.data,
            tree=req.tree,
            chat_history=[m.model_dump() for m in req.chatHistory],
        )
        return result
    except BudgetExceeded as e:
        raise HTTPException(429, str(e)) from e
    except Exception as e:
        log.exception("mutate failed")
        raise HTTPException(500, str(e)) from e


@app.get("/api/budget")
async def budget_status():
    return _budget_snapshot()


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
