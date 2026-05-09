import type { WidgetNode } from "../../lib/types";
import { resolveBinding } from "../bindings";

export function KanbanBoard({ node, data, backendUrl }: { node: WidgetNode; data: Record<string, unknown>; backendUrl: string | null }) {
  const cols = resolveBinding(node.bindings?.columns ?? "$.", data, backendUrl);
  const arr = (Array.isArray(cols) ? cols : []) as Array<{
    name: string;
    items: Array<{ id?: string; title: string; subtitle?: string }>;
  }>;
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {arr.map((col, i) => (
        <div key={i} className="min-w-[140px] rounded-2xl bg-neutral-900 p-2">
          <div className="text-[10px] uppercase tracking-wide text-neutral-500 px-1 pb-1.5">{col.name}</div>
          <div className="space-y-1.5">
            {(col.items ?? []).map((it, j) => (
              <div key={it.id ?? j} className="rounded-lg bg-neutral-800 p-2">
                <div className="text-xs font-medium">{it.title}</div>
                {it.subtitle && <div className="text-[10px] text-neutral-500">{it.subtitle}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
