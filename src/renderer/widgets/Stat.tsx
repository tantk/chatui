import type { WidgetNode } from "../../lib/types";
import { resolveBinding } from "../bindings";

type Props = { node: WidgetNode; data: Record<string, unknown>; backendUrl: string | null };

export function Stat({ node, data, backendUrl }: Props) {
  const label = (node.props?.label as string) || "";
  const valueExpr = node.bindings?.value;
  const value = valueExpr ? resolveBinding(valueExpr, data, backendUrl) : "—";
  return (
    <div className="rounded-2xl bg-neutral-900 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{String(value ?? "—")}</div>
    </div>
  );
}
