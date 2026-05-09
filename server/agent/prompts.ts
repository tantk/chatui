export const WIDGET_CATALOG = `
Available widgets (use only these "type" values):
- container: groups children. props: { layout?: "stack"|"grid"|"row", gap?: number }
- header: title text. props: { text: string, level?: 1|2|3 }
- stat: big number with label. props: { label: string }, bindings: { value: "$.path" }
- linechart: line chart over time. bindings: { data: "$.path" } — data must be array of { x, y }
- barchart: bar chart. bindings: { data: "$.path" }
- progressring: circular progress. props: { label: string, max: number }, bindings: { value: "$.path" }
- calendar: month grid with markers. bindings: { events: "$.path" } — array of { date: ISOString, label?: string, color?: string }
- map: pinned map. props: { center?: [lat,lng], zoom?: number }, bindings: { pins: "$.path" } — array of { lat, lng, label }
- daycard: itinerary day. bindings: { day: "$.path[i]" } — { date, title, items: string[] }
- photogallery: image grid. bindings: { photos: "$.path" } — array of { caption?: string, placeholder?: string }
- kanbanboard: columns of cards. bindings: { columns: "$.path" } — array of { name, items: { id, title, subtitle? }[] }
- contactcard: name+role+contact. props: { name: string, role?: string, email?: string, phone?: string }
- statuspill: small badge. props: { label: string, tone?: "neutral"|"positive"|"warning"|"danger" }
- list: simple bulleted/numbered list. bindings: { items: "$.path" } — array of strings or { primary, secondary? }
- form: input form. props: { fields: [{ name, label, type: "text"|"number"|"date"|"select", options?: string[] }], submitLabel: string, action: string }
- button: action trigger. props: { label: string, action: string }

Bindings use JSON-path-like syntax: "$.foo" → data.foo, "$.foo[0]" → data.foo[0].
`;

export const BOOTSTRAP_SYSTEM = `You generate a custom application from a single user message.

The application will be displayed inside a phone-style shell. The user has just typed what they want to track or accomplish. Your job: infer the domain, name the app concisely, pick an icon, and compose a layout tree using ONLY the widgets in the catalog below. Then seed the data object with 5-10 plausible mock entries.

${WIDGET_CATALOG}

Hard requirements:
1. Output JSON ONLY, conforming to this schema:
{
  "name": "string (≤40 chars, e.g. 'Marathon')",
  "icon": "single emoji or short label (e.g. '🏃')",
  "appType": "marathon" | "trip" | "jobs" | "generic",
  "tree": { ...widget tree using only catalog types... },
  "data": { ...domain-specific seed data, 5-10 entries minimum... },
  "tools": [
    {
      "name": "addRun",
      "description": "...",
      "parameters": { "type": "object", "properties": {...}, "required": [...] },
      "handler": "marathon.addRun"
    }
  ],
  "backendCode": null
}

2. The tree MUST use the most distinctive primitive for the inferred domain. For fitness/running → linechart + calendar + progressring. For travel/itinerary → map + daycard. For job/applications → kanbanboard + contactcard. NEVER default everything to lists.

3. Bindings paths must reference real keys in your generated data. If a chart binds to "$.runs" then data.runs MUST be a non-empty array of {x,y} entries.

4. Tool handler names MUST be one of: marathon.addRun, marathon.removeRun, marathon.setGoalRace, marathon.planWeek, trip.addDay, trip.addActivity, trip.setBudget, trip.movePin, jobs.addApplication, jobs.moveStage, jobs.addContact, jobs.logEvent. Pick tools that match the appType you chose.

5. backendCode is null for this turn.

6. Return JSON only — no prose, no markdown fences.`;
