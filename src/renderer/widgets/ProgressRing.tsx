import type { WidgetNode } from "../../lib/types";
import { resolveBinding } from "../bindings";

export function ProgressRing({ node, data, backendUrl }: { node: WidgetNode; data: Record<string, unknown>; backendUrl: string | null }) {
  const label = (node.props?.label as string) || "";
  const max = (node.props?.max as number) || 100;
  const raw = resolveBinding(node.bindings?.value ?? "$.", data, backendUrl);
  const value = typeof raw === "number" ? raw : 0;
  const pct = Math.min(1, Math.max(0, value / max));
  const C = 2 * Math.PI * 36;
  return (
    <div className="rounded-2xl bg-neutral-900 p-4 flex items-center gap-4">
      <svg width="80" height="80">
        <circle cx="40" cy="40" r="36" stroke="#262626" strokeWidth="8" fill="none" />
        <circle cx="40" cy="40" r="36" stroke="#22c55e" strokeWidth="8" fill="none"
          strokeDasharray={`${pct * C} ${C}`} transform="rotate(-90 40 40)" strokeLinecap="round" />
      </svg>
      <div>
        <div className="text-xs uppercase text-neutral-400">{label}</div>
        <div className="text-2xl font-semibold">{value}<span className="text-sm text-neutral-500"> / {max}</span></div>
      </div>
    </div>
  );
}
