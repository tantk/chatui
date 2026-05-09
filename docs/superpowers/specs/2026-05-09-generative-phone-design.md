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

## Architecture

Four pieces.

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

Single Anthropic API call per chat turn. Two prompt modes:

#### Bootstrap (required)

- **Input:** user's first message in a new chat thread.
- **Output (JSON):** `{ name: string, icon: string, tree: A2UITree, data: object }`
- **System prompt:** explains the widget catalog, the JSON output schema, and instructs the model to (a) infer the user's domain, (b) name the app concisely, (c) pick a single emoji or short SVG path for the icon, (d) compose a layout that maximally distinguishes this app from generic chat, (e) seed the data object with 5–10 plausible mock entries so the app looks alive on first render.

#### Mutate (stretch goal — NOT demo-required)

- **Input:** current tree + data + chat turn.
- **Output:** full new tree + (optionally) data delta.
- Only built if time permits after the bootstrap path is solid. The committed demo arc does not depend on mutation working.

Model: **Claude Sonnet 4.6** (`claude-sonnet-4-6`) for cost and speed; fall back to **Opus 4.7** (`claude-opus-4-7`) only if Sonnet's structured-output reliability is insufficient. Use prompt caching for the static system prompt + widget catalog (large, identical across calls — high hit rate, meaningful savings even within a 6h session).

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
| LLM | `@anthropic-ai/sdk`, Sonnet 4.6 default |
| Charts | Recharts |
| Map | Leaflet + react-leaflet |
| Calendar | react-day-picker |
| Kanban | dnd-kit (or static layout if drag complexity bites) |
| Layout protocol | A2UI tree shape (will inspect starter kit at start of build) |
| State | `useState` + Context. No Zustand/Redux. |
| Tests | One smoke test per widget that it renders without crashing on its example data. No more. |

## Non-goals (cuts to fit 6h)

- **No real APIs.** No Strava, no Google Flights, no Maps Geocoding. Seed data is generated by the agent at bootstrap and is the only data that ever exists.
- **No code synthesis (Level 3).** The agent picks compositions of pre-built widgets. The "magic" is composition diversity, not generated JSX. This avoids sandbox/iframe scope and broken-JSX recovery.
- **No multi-user, no auth, no sharing.** Single browser, single user.
- **No app deletion UI.** Clearing localStorage in devtools is the reset path.
- **No mobile-actual.** It's a web app shaped like a phone, viewed on desktop. Responsive is not a goal.
- **No real interactivity beyond clicks/form fills.** Dragging on the kanban is nice but optional.
- **Mutation prompt is a stretch goal.** Demo does not require it.

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Agent emits invalid tree → blank screen on stage | medium | Schema validation in renderer; render a recoverable "agent had a moment, try again" card with the raw error; users (and demo recordings) retry |
| Generation latency too slow for demo | medium | Stream tokens; show a skeleton card the moment we identify which widgets are coming; record demo with healthy network |
| All three apps look samey (agent defaults to lists) | high if prompt is weak | Bootstrap system prompt explicitly nudges toward the most distinctive primitive for the inferred domain; few-shot includes the trio's expected layouts |
| Widget library too sparse for the trio | medium | The 15 primitives were chosen specifically to span the trio. Any cuts come from primitives outside the trio. |
| Vite + Tailwind + Leaflet integration friction | low | All three are well-trodden; Leaflet's only known gotcha is its CSS, which is an `import` line |
| Anthropic API key not in env | low | Add `.env.local` with `VITE_ANTHROPIC_API_KEY` — and verify `.gitignore` covers it before any commit (per global rule on secrets) |

## Success criteria

- **Functional:** Three apps generate from three first-messages, persist across reload, and look visibly different. Each has interactive widgets that don't crash on tap.
- **Demo:** A 90-second video matching the demo arc above can be recorded in one take.
- **Submission:** Public GitHub repo, demo video link, working app deployed (Vercel / Netlify), submission form completed by 5:45 PM local.
- **Theme:** A judge can answer "would this have been impossible with a chat interface?" with an obvious yes after watching the video for 10 seconds.

## Open questions

None blocking. Items deferred to implementation:

- Exact A2UI tree shape — finalize after inspecting the starter kit at build start. If A2UI's published shape works, use it as-is and list "A2UI" on the submission form. If it's unworkable in 6h, build a minimal in-house tree shape and list "custom JSON tree" honestly — do NOT claim A2UI on the submission unless we are actually conforming to it.
- Icon strategy — emoji is the default, but if there's time, an LLM-picked Lucide icon set would look more polished.
- Streaming UX — partial render of the tree while tokens arrive vs. wait-and-show. Decide at hour 3.
