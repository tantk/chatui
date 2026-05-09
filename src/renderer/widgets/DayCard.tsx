import type { WidgetNode } from "../../lib/types";
import { resolveBinding } from "../bindings";

export function DayCard({ node, data, backendUrl }: { node: WidgetNode; data: Record<string, unknown>; backendUrl: string | null }) {
  const day = resolveBinding(node.bindings?.day ?? "$.", data, backendUrl) as
    | { date?: string; title?: string; items?: string[] }
    | undefined;
  if (!day) return null;
  return (
    <div className="rounded-2xl bg-neutral-900 p-4">
      {day.date && <div className="text-xs uppercase text-neutral-500">{day.date}</div>}
      {day.title && <div className="text-sm font-semibold mt-0.5">{day.title}</div>}
      {day.items?.length ? (
        <ul className="mt-2 space-y-1 text-xs text-neutral-300">
          {day.items.map((it, i) => <li key={i}>• {it}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
