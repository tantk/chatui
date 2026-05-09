# Generative Phone — Design Spec

**Date:** 2026-05-09
**Author:** tantk7
**Event:** Generative UI Global Hackathon (6h, solo)
**Track:** No Designer, No Problem (Track 4) — cross-tagged Agent App Store (Track 3)

## Vision

A web app that looks like a phone home screen. The only pre-built app is **"New Chat."** Tapping it opens a plain chat composer. The user types what they want help with — *"track my marathon training"* — and on submit:

1. The agent generates a custom application for that intent: a name, an icon, a layout tree of widgets, and seed data.
2. A new icon appears on the home screen.
3. The user is dropped into the new app, with a chat composer pinned to the bottom for refinement.

Subsequent chats install more apps. Closing and reopening the page persists everything. The headline: **"GPTs, but the GPT renders an app instead of replying with text."**

## One-line pitch

A chat client whose sidebar is a phone home screen, where every conversation materializes as a custom-rendered app whose layout the agent generates on first message.

## Theme fit

- **Track 4 (No Designer, No Problem):** the layout tree of every app is generated at runtime. There is no `MarathonTracker.tsx`, `JapanItinerary.tsx`, or `JobApplications.tsx` in the codebase — those layouts come into existence when the user submits their first chat message.
- **Track 3 (Agent App Store, cross-tag):** the home screen is a runtime-grown app collection. Apps are "installed" by talking, not by visiting an App Store.
- **"Could not have been a chatbot" test:** a chatbot can't render a Japan map with pinned days, a kanban board with status pills, or a weekly mileage chart. Each thread is structurally distinct from every other thread.

## Demo arc (the video we will ship)

The demo is the work. Every design decision below is in service of this 90-second clip.

1. Open the app. Phone-frame home screen, only one icon: **New Chat**.
2. Tap New Chat. Plain chat. Type: *"I'm training for the Boston marathon in October, I run 4x/week."*
3. ~5s skeleton. Screen transitions to the new app: title "Marathon", running-figure icon, weekly mileage chart, calendar of planned runs, race countdown ring, recent runs list with seed data.
4. Hit home button → home screen now has **New Chat + Marathon**.
5. Tap New Chat. Type: *"Plan my Japan honeymoon, two weeks, Tokyo + Kyoto + Osaka."*
6. ~5s. New app: title "Japan Trip", torii-gate icon, map with pinned cities, day-by-day cards, photo placeholders, budget stat.
7. Hit home → home screen now has 3 icons.
8. Tap New Chat. Type: *"Track my software engineering job applications."*
9. ~5s. New app: title "Job Hunt", briefcase icon, kanban board with stages (Applied / Phone Screen / Onsite / Offer), contact cards, status pills.
10. Hit home → final shot of 4 visibly different icons.

The demo trio is selected for **maximum visual disparity**: chart-driven, map-driven, board-driven. A judge with sound off can immediately see the diversity.

## Generation strategy: B1 baseline + B3 gambit

We are committing to a layered execution plan. Ship the safe version first, then attempt the ambitious version on top.

**B1 (baseline, demo-required):** Agent generates UI tree + seed data + makes function calls against pre-written tools (`addRun`, `moveJobToStage`, `insertDay`, etc.) to mutate local state. Each app's "backend" is local state plus the agent itself wired to a small toolset. This must work end-to-end for all three apps.

**B3 (gambit, one app only, demo-bonus):** For ONE of the three demo apps (the marathon tracker is the planned target), the bootstrap call additionally generates a Python file that runs in a per-app Daytona sandbox. The sandbox exposes an HTTP endpoint that the UI binds to. The agent has literally written and deployed a backend service for this app at runtime. If this works on stage, it is the highest-impact demo moment in the entire submission. If it doesn't work by hour 4-5, we rip it out and ship B1 across all three apps.

**Hard rule:** B3 work does not start until B1 is end-to-end working for all three apps. No exceptions.

## Architecture

Four pieces (B1) plus one optional fifth (B3). All deployed as a single Cloud Run container.

**Deployment shape:** one Node/Express server serves both the static Vite build (the React app) at `/` and the API routes (`/api/bootstrap`, `/api/mutate`) under `/api/*`. Cloud Run handles HTTPS, scaling, and routing. Server has access to all secret env vars; browser only ever sees `/api/*` JSON responses.

**Why Cloud Run:** single deploy command (`gcloud run deploy --source .`), automatic HTTPS, Vertex AI auth via Application Default Credentials (no service-account JSON to manage), full Google sponsor stack. Cold start risk mitigated by `--min-instances=1` during demo.

### 1. Shell

The phone-frame UI. React + Tailwind. Owns:

- Home screen (icon grid, "New Chat" always present, generated apps listed in install order)
- Top status bar (cosmetic)
- Bottom nav: home button, back button
- App list state: `App[]` persisted to `localStorage` keyed by app ID
- Active app routing (no react-router needed; a single `activeAppId` state in context)

### 2. Renderer

Recursively walks an A2UI-shaped JSON tree and paints React components from the widget library. Pure, side-effect-free. Inputs:

- `tree`: the layout tree
- `data`: app data (separate object the tree binds to via paths)
- `onAction(name, payload)`: callback for widget interactions, routed to the agent layer or local state mutators

Validates the tree against a schema; on validation failure, shows a recoverable "agent had a moment" card instead of a blank screen.

### 3. Widget library

15 primitives. Each is a small React component, themed once via Tailwind, accepting data via props with consistent contract (`{ data, bindings, onAction }`).

| Widget | Used by |
|---|---|
| `Container` | all |
| `Header` | all |
| `Stat` | all (race countdown, budget, offers count) |
| `LineChart` | Marathon (weekly mileage) |
| `ProgressRing` | Marathon (race countdown), Job Hunt (response rate) |
| `Calendar` | Marathon (planned runs) |
| `List` | Marathon (recent runs), all |
| `Map` | Japan Trip (city pins) |
| `DayCard` | Japan Trip (per-day itinerary) |
| `PhotoGallery` | Japan Trip (placeholder photos) |
| `KanbanBoard` | Job Hunt (stages) |
| `ContactCard` | Job Hunt (recruiter contacts) |
| `StatusPill` | Job Hunt (stage badges) |
| `Form` | all (mutation entry points; lightweight) |
| `Button` | all |

The bootstrap prompt includes a catalog of these widgets with one-line descriptions and JSON shape examples, so the agent composes from a known set.

### 4. Agent layer

Single Google Gemini API call per chat turn, wrapped in LangSmith tracing. Two prompt modes:

#### Bootstrap (required)

- **Input:** user's first message in a new chat thread.
- **Output (JSON):** `{ name: string, icon: string, tree: A2UITree, data: object }`
- **System prompt:** explains the widget catalog, the JSON output schema, and instructs the model to (a) infer the user's domain, (b) name the app concisely, (c) pick a single emoji or short SVG path for the icon, (d) compose a layout that maximally distinguishes this app from generic chat, (e) seed the data object with 5–10 plausible mock entries so the app looks alive on first render.

#### Mutate (demo-required for B1)

- **Input:** current tree + data + chat history + tools available for this app.
- **Output:** either a tool call (e.g., `addRun({date, miles, pace})`) that mutates `data`, or a new tree if the user asked for a structural change.
- Per-app tool catalog is generated by the bootstrap call (agent declares "this marathon app has these tools" as part of the bootstrap response). The mutate prompt then sees those tools as Gemini function declarations.
- Without mutation, the apps are static mockups. With mutation, the agent IS the backend — natural language is the input modality, the agent translates intent into state changes, the generated UI reacts.

### 5. (Optional, B3 gambit) Daytona sandbox layer

For one app only, the bootstrap call also generates Python code (a small Flask/FastAPI service) and a sandbox config. Our shell:

1. Calls Daytona API to create a sandbox.
2. Uploads the generated `app.py` (and any `requirements.txt`).
3. Starts the service inside the sandbox.
4. Retrieves the public preview URL.
5. Stores the URL on the app record; widgets in the tree can reference it as a binding source (e.g., `chart.dataSource = "$BACKEND/metrics"`).

The renderer treats `$BACKEND/...` bindings as `fetch` calls. Failure of the fetch falls back to `data` (the seed data the agent generated).

This means: **B3 degrades cleanly to B1 if anything in the Daytona pipeline breaks.** The app still works without the sandbox.

Model: **Gemini Pro** (latest stable — verify exact ID when keys are issued) for the bootstrap call (quality matters, only one call per app). Fall back to **Gemini Flash** if Pro latency is too slow for the 5s skeleton goal on demo recording. Structured output via `responseMimeType: "application/json"` + `responseSchema` matching the `{name, icon, tree, data}` shape.

**Observability:** all LLM calls wrapped with LangSmith's `traceable`. Project name `genphone-hackathon`. Traces double as live debugging during the build (when an app generates weirdly, click the trace, see the prompt + response without printf-debugging).

## Data model

```ts
type App = {
  id: string;            // uuid
  name: string;          // "Marathon"
  icon: string;          // single emoji OR short identifier mapped to a Lucide icon
  createdAt: number;
  tree: A2UITree;        // layout tree the renderer walks
  data: Record<string, unknown>;  // bindings target; widgets read via JSON paths
  chatHistory: ChatMessage[];     // in-app composer history (for mutate prompt)
};

type ChatMessage = { role: 'user' | 'assistant'; content: string; ts: number };
```

Apps are persisted as a single `apps` array in `localStorage`. No migrations. If the schema changes mid-hackathon and breaks existing local data, the user clears it manually — acceptable for a 6h prototype.

## Persistence

- Single `localStorage` key: `genphone:apps`
- Single `localStorage` key: `genphone:activeAppId`
- No backend, no auth, no sync, no multi-device.

## Tech stack

| Concern | Choice |
|---|---|
| Build tool | Vite |
| Framework | React 18 + TypeScript |
| Styling | Tailwind |
| Server | Node + Express in the same container, serving `dist/` static + `/api/*` |
| LLM | `@google-cloud/vertexai` SDK against Vertex AI, Gemini Pro default (Flash fallback for speed) |
| Observability | `langsmith` SDK — `traceable` wrapper around every LLM call |
| Hosting | Google Cloud Run, `gcloud run deploy --source .`, `--min-instances=1` during demo to avoid cold start |
| Auth (Vertex AI) | Application Default Credentials — Cloud Run service account is granted the Vertex AI User role; no JSON key files |
| Charts | Recharts |
| Map | Leaflet + react-leaflet |
| Calendar | react-day-picker |
| Kanban | dnd-kit (or static layout if drag complexity bites) |
| Layout protocol | A2UI tree shape (will inspect starter kit at start of build) |
| Sandbox (B3 only) | Daytona — `@daytonaio/sdk` or REST API; default sandbox (1 vCPU / 1 GB / 3 GiB disk) is enough |
| State | `useState` + Context. No Zustand/Redux. |
| Tests | One smoke test per widget that it renders without crashing on its example data. No more. |

## Non-goals (cuts to fit 6h)

- **No real external APIs.** No Strava, no Google Flights, no Maps Geocoding. The B3 sandbox runs agent-generated code but does not make outbound calls to third-party services — its data is self-contained.
- **No frontend code synthesis (Level 3 UI).** The agent picks compositions of pre-built widgets. The "magic" is composition diversity, not generated JSX. This avoids in-browser code-eval risk. Backend code synthesis (B3) is on the table because Daytona provides a real sandbox.
- **No multi-user, no auth, no sharing.** Single browser, single user.
- **No app deletion UI.** Clearing localStorage in devtools is the reset path.
- **No mobile-actual.** It's a web app shaped like a phone, viewed on desktop. Responsive is not a goal.
- **No real interactivity beyond clicks/form fills.** Dragging on the kanban is nice but optional.
- **B3 sandbox is a gambit, not a baseline.** Demo works without it. We attempt B3 only after B1 is fully working for all three apps.

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Agent emits invalid tree → blank screen on stage | medium | Schema validation in renderer; render a recoverable "agent had a moment, try again" card with the raw error; users (and demo recordings) retry |
| Generation latency too slow for demo | medium | Stream tokens; show a skeleton card the moment we identify which widgets are coming; record demo with healthy network |
| All three apps look samey (agent defaults to lists) | high if prompt is weak | Bootstrap system prompt explicitly nudges toward the most distinctive primitive for the inferred domain; few-shot includes the trio's expected layouts |
| Widget library too sparse for the trio | medium | The 15 primitives were chosen specifically to span the trio. Any cuts come from primitives outside the trio. |
| Vite + Tailwind + Leaflet integration friction | low | All three are well-trodden; Leaflet's only known gotcha is its CSS, which is an `import` line |
| API keys not in env | low | Set `LANGSMITH_API_KEY` and `DAYTONA_API_KEY` as Cloud Run env vars (NOT prefixed `VITE_` — they are server-only). Vertex AI uses ADC, no key needed. Verify `.gitignore` covers any local `.env` before any commit (per global rule on secrets) |
| Service account JSON committed by accident | medium | We deliberately do NOT use service-account JSON files — Cloud Run's runtime ADC means no key files exist locally. If a teammate downloads one for local dev, ensure `*.json` patterns in `.gitignore` and a literal-string secret scan before push |
| Cloud Run cold start during demo | medium | Set `--min-instances=1` for the recording session. Costs cents from the GCP free trial. Revert to scale-to-zero after demo |
| `gcloud` CLI setup time | low | First-time setup is ~5 min: `gcloud auth login`, set project, enable Cloud Run + Vertex AI APIs. Do this at hour 0 before writing any code |
| Gemini structured-output schema drift | medium | Gemini's JSON-schema mode is good but occasionally emits fields not in the schema. Mitigation: schema validation already in renderer + retry once with the validation error in the next prompt |
| (B3) Daytona sandbox cold start during demo recording | high | Default sandbox auto-stops after 15 min idle. Mitigation: pre-warm the marathon-app sandbox immediately before recording the demo; record demo in a single take |
| (B3) Generated Python code is broken | medium | Tight system prompt with a starter template; sandbox returns 500 on import error → frontend falls back to seed data and the app still works |
| (B3) Daytona API integration eats more than 1.5h | medium | Hard cutoff at hour 5: if B3 isn't running end-to-end on the marathon app, rip it out and ship B1-only |
| (B3) Networking from deployed Vercel frontend to Daytona preview URL | medium | Verify CORS + public URL reachability during integration; fall back to running both locally for the demo recording if cross-origin breaks |

## Success criteria

- **Functional:** Three apps generate from three first-messages, persist across reload, and look visibly different. Each has interactive widgets that don't crash on tap.
- **Demo:** A 90-second video matching the demo arc above can be recorded in one take.
- **Submission:** Public GitHub repo, demo video link, app deployed to Google Cloud Run (single container), submission form completed by 5:45 PM local. Submission "protocols used" field: A2UI + LangSmith + Vertex AI (+ Daytona if B3 ships).
- **Theme:** A judge can answer "would this have been impossible with a chat interface?" with an obvious yes after watching the video for 10 seconds.

## Open questions

None blocking. Items deferred to implementation:

- Exact A2UI tree shape — finalize after inspecting the starter kit at build start. If A2UI's published shape works, use it as-is and list "A2UI" on the submission form. If it's unworkable in 6h, build a minimal in-house tree shape and list "custom JSON tree" honestly — do NOT claim A2UI on the submission unless we are actually conforming to it.
- Exact Gemini model ID — verify against current Vertex AI / Google AI Studio offerings when API keys are in hand. Default to current Gemini Pro; switch to Flash if Pro latency exceeds ~10s end-to-end.
- Daytona sandbox networking model — verify whether preview URLs are public-by-default or require auth headers, and confirm CORS posture before wiring up the Cloud Run frontend.
- GCP project ID + region — confirm at hour 0 when setting up `gcloud`. Default to `us-central1` unless there's a regional reason to prefer otherwise.
- Icon strategy — emoji is the default, but if there's time, an LLM-picked Lucide icon set would look more polished.
- Streaming UX — partial render of the tree while tokens arrive vs. wait-and-show. Decide at hour 3.
