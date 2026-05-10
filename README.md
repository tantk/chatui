# Generative Phone

> **A chat client where every conversation materializes as a custom-installed app. The agent designs the UI, the data, AND the tool implementations — at runtime, for any domain.**

Built for the **Generative UI Global Hackathon** — Track 4: *No Designer, No Problem*.

- **Live app:** https://genphone-688135886452.us-central1.run.app
- **Source:** https://github.com/tantk/chatui

## What it is

Open a phone-shaped home screen with one default app: **+New Chat**. Type what you want help with — *"track my marathon training"*, *"plan my Japan honeymoon"*, *"track my beekeeping operation"* — and the agent generates a complete app for that intent: a name, an icon, a layout tree, seed data, and a set of domain-specific tools. A new icon appears on the home screen. Tap it, you're inside an app whose layout exists nowhere in this codebase.

Every chat thread is a persistent micro-app shaped to that user's specific intent. The home screen grows as the user has more conversations.

## What's actually generative

The system is **domain-agnostic by design**. Zero hand-coded handlers in the backend.

**Bootstrap (one Gemini call per new app):** The agent receives the user's first message and produces a single JSON object containing:

1. `name` — the app's name (e.g., *"Marathon Pro"*, *"Apiary Manager"*)
2. `icon` — a single emoji chosen for the inferred domain
3. `appType` — `marathon | trip | jobs | generic` (loose hint, not load-bearing)
4. `tree` — the UI layout, composed from a 16-widget catalog (chart, kanban, map, calendar, list, form, etc.)
5. `data` — 5-10 plausible seed entries shaped to the domain
6. `tools` — a list of the tools this app should have, each with **its own implementation as a JSON-Patch template** the agent just wrote
7. `backendCode` *(optional, marathon only — the B3 gambit)* — Python source for a FastAPI service the agent wants to deploy

The agent has invented all of this. The server only knows how to render the tree, interpret the patch templates, and (for B3) ship the Python to a Daytona sandbox.

**Mutate (per chat turn inside an app):** The agent has access to:
- The per-app tools it declared at bootstrap (interpreted via the JSON-Patch template engine)
- A universal `applyDataPatch(patches)` for surgical field updates
- A universal `editLayout(newTree)` for structural UI changes

Type *"I ran 5 miles at 8:30 pace this morning"* — the agent calls its own `logRun` tool. Type *"swap the chart for a bar chart"* — the agent calls `editLayout` with a new tree. Type *"actually add a section for this week's mileage goal"* — the agent uses `editLayout` again. The UI keeps reshaping live.

## Architecture (in 4 pieces)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite + Tailwind)                                    │
│  ─ Phone shell, home screen, persistence in localStorage               │
│  ─ Renderer: walks the agent-generated tree, paints from a 16-widget   │
│    catalog (Recharts, Leaflet, react-day-picker, dnd-kit, hand-rolled) │
│  ─ Drag-resizable chat panel, full history, auto-scroll                │
└────────────────────────────────────────────────────────────────────────┘
                          │   POST /api/{bootstrap,mutate}
                          │   GET  /api/app/:id/backend  (B3 polling)
                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Backend (FastAPI + Python 3.12)                                       │
│  ─ Bootstrap: one ADK Agent call → structured JSON app blob            │
│  ─ Mutate: ADK Agent + per-app FunctionTools built from the agent's    │
│    JSON-Patch templates + universal applyDataPatch + editLayout        │
│  ─ Template interpreter: substitutes <<arg>> placeholders, applies      │
│    RFC-6902-style ops (add, replace, remove)                           │
│  ─ Budget guard: per-process token accounting, HTTP 429 at $80 of $100 │
│    cap. Hard cap also enforced at GCP billing level.                    │
└────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Per-app sandbox (Daytona — marathon apps only, B3 gambit)             │
│  ─ Bootstrap also generates a Python FastAPI service                   │
│  ─ Server provisions a Daytona Python sandbox async, uploads the code, │
│    starts uvicorn, returns the public preview URL via polling          │
│  ─ Frontend widgets bound to $BACKEND/* fetch live data, swap from     │
│    seed data with a green "live" badge                                 │
└────────────────────────────────────────────────────────────────────────┘
```

## The "no hardcoded handlers" claim, made concrete

Earlier versions of this system had `server/agent/tools/marathon.py`, `trip.py`, `jobs.py` — hand-coded Python functions for `addRun`, `addDay`, `moveStage`, etc. That was a mistake. It meant the system only worked for three domains and the prize wouldn't have deserved itself.

It now works like this:

```python
# Bootstrap returns this for a marathon app:
{
  "name": "Marathon Pro",
  "tools": [
    {
      "name": "logRun",
      "description": "Log a completed run",
      "parameters": {"type": "object", "properties": {
        "date": {"type": "string"}, "miles": {"type": "number"}, "pace": {"type": "string"}
      }, "required": ["date", "miles", "pace"]},
      "implementation": {
        "type": "patch",
        "patches": [
          {"op": "add", "path": "/runs/-", "value": {
            "date": "<<date>>", "miles": "<<miles>>", "pace": "<<pace>>",
            "x": "<<date>>", "y": "<<miles>>"
          }}
        ]
      }
    }
  ]
}
```

For a beekeeping app, the agent writes a *different* set of tools (`logInspection`, `recordHoney`, `addHive`) with *different* patch templates pointed at *different* data paths. The server runs the same generic interpreter for all of them.

There is no `if appType == "marathon": ...` anywhere on the server side.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React 19 + TypeScript + Tailwind v3 |
| Charts / maps / calendar | Recharts, Leaflet, react-day-picker |
| Backend | FastAPI + Python 3.12, dependencies via `uv` |
| Agent | Google ADK 1.33 (`google-adk`), AI Studio API |
| Model | `gemini-3-flash-preview` (verified on AI Studio free tier) |
| Observability | LangSmith (`@traceable` wraps every Gemini call) |
| Sandbox | Daytona (`daytona` PyPI package, async client) |
| Hosting | Google Cloud Run (single multi-stage Docker container) |
| Secrets | Google Secret Manager (mounted at runtime as env vars) |
| Budget | Per-process token accounting + GCP billing budget alert |

## Run locally

```bash
git clone https://github.com/tantk/chatui.git
cd chatui

# Frontend deps
npm install

# Backend deps via uv (https://github.com/astral-sh/uv)
uv sync

# Provide secrets
cp .env.example .env.local
# Edit .env.local with:
#   GEMINI_API_KEY=...     (https://aistudio.google.com/app/apikey)
#   LANGSMITH_API_KEY=...  (optional; tracing skipped if absent)
#   DAYTONA_API_KEY=...    (optional; B3 marathon backend skipped if absent)
#   B3_ENABLED=1           (set to 0 to disable Daytona path entirely)

# Start frontend + backend together
npm run dev
# → frontend on http://localhost:5173
# → backend  on http://localhost:8090 (Vite proxies /api there)
```

## Project layout

```
.
├── server/               # FastAPI + ADK
│   ├── main.py           # routes: /api/bootstrap, /api/mutate, /api/app/:id/backend, /api/budget
│   ├── agent/
│   │   ├── bootstrap.py  # phase A: one ADK call returns the full app blob
│   │   ├── mutate.py     # function-calling loop + JSON-Patch template interpreter
│   │   ├── prompts.py    # BOOTSTRAP_SYSTEM, MUTATE_SYSTEM, B3_MARATHON_BACKEND, WIDGET_CATALOG
│   │   └── schema.py     # Pydantic models for the agent's I/O
│   ├── sandbox/          # Daytona wrapper + async provisioner state machine
│   └── obs/              # LangSmith tracing, budget guard
├── src/                  # React frontend
│   ├── shell/            # PhoneFrame, HomeScreen, NewChatScreen, AppView, BootstrapView
│   ├── chat/             # ChatComposer
│   ├── renderer/         # Renderer + 16 widget components + binding resolver
│   └── lib/              # api.ts, storage.ts, types.ts
├── tests/
│   ├── smoke/            # bootstrap_smoke.py — Phase 0 gate
│   └── server/           # unit tests for the template interpreter
├── docs/superpowers/     # the spec and implementation plan that drove the build
├── Dockerfile            # multi-stage: node build → python runtime
└── pyproject.toml
```

## Hackathon notes

This was built solo in 6 hours on May 9-10, 2026, for the AI Tinkerers Generative UI Global Hackathon. The architecture went through a real refactor mid-build — an earlier draft hardcoded per-domain handlers, which was correctly identified as bad design and replaced with the agent-authored JSON-Patch templates described above. The spec and implementation plan that drove the build are checked in at `docs/superpowers/`.

Protocols / sponsor stack used: **Gemini (AI Studio)** · **Google ADK** · **LangSmith** · **Daytona** · **Google Cloud Run** · **Secret Manager**

## License

Apache 2.0.
