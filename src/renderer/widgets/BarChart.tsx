import { BarChart as RBarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { WidgetNode } from "../../lib/types";
import { resolveBinding } from "../bindings";

export function BarChart({ node, data, backendUrl }: { node: WidgetNode; data: Record<string, unknown>; backendUrl: string | null }) {
  const series = resolveBinding(node.bindings?.data ?? "$.", data, backendUrl);
  const arr = Array.isArray(series) ? series : [];
  return (
    <div className="rounded-2xl bg-neutral-900 p-4 h-48">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={arr}>
          <XAxis dataKey="x" stroke="#666" fontSize={11} />
          <YAxis stroke="#666" fontSize={11} />
          <Tooltip contentStyle={{ background: "#171717", border: "none" }} />
          <Bar dataKey="y" fill="#22c55e" />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
