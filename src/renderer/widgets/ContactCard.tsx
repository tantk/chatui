import type { WidgetNode } from "../../lib/types";

export function ContactCard({ node }: { node: WidgetNode }) {
  const p = (node.props ?? {}) as { name?: string; role?: string; email?: string; phone?: string };
  return (
    <div className="rounded-2xl bg-neutral-900 p-3">
      <div className="text-sm font-semibold">{p.name}</div>
      {p.role && <div className="text-xs text-neutral-400">{p.role}</div>}
      <div className="mt-1 text-xs text-neutral-500 space-x-2">
        {p.email && <a href={`mailto:${p.email}`} className="underline">{p.email}</a>}
        {p.phone && <span>{p.phone}</span>}
      </div>
    </div>
  );
}
