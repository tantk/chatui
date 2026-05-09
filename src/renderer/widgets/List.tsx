import type { WidgetNode } from "../../lib/types";
import { resolveBinding } from "../bindings";

type Props = { node: WidgetNode; data: Record<string, unknown>; backendUrl: string | null };

export function List({ node, data, backendUrl }: Props) {
  const items = resolveBinding(node.bindings?.items ?? "$.", data, backendUrl);
  const arr = Array.isArray(items) ? items : [];
  return (
    <ul className="rounded-2xl bg-neutral-900 p-4 space-y-2">
      {arr.map((it, i) => {
        if (typeof it === "string") return <li key={i} className="text-sm">{it}</li>;
        const o = it as { primary?: string; secondary?: string };
        return (
          <li key={i} className="text-sm">
            <div>{o.primary ?? JSON.stringify(it)}</div>
            {o.secondary && <div className="text-xs text-neutral-500">{o.secondary}</div>}
          </li>
        );
      })}
    </ul>
  );
}
