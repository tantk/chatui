import { LineChart as RLineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { WidgetNode } from "../../lib/types";
import { resolveBinding } from "../bindings";

type Props = { node: WidgetNode; data: Record<string, unknown>; backendUrl: string | null };

export function LineChart({ node, data, backendUrl }: Props) {
  const expr = node.bindings?.data ?? "$.";
  const series = resolveBinding(expr, data, backendUrl);
  const arr = Array.isArray(series) ? series : [];
  return (
    <div className="rounded-2xl bg-neutral-900 p-4">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RLineChart data={arr}>
            <XAxis dataKey="x" stroke="#666" fontSize={11} />
            <YAxis stroke="#666" fontSize={11} />
            <Tooltip contentStyle={{ background: "#171717", border: "none" }} />
            <Line type="monotone" dataKey="y" stroke="#22c55e" strokeWidth={2} dot={false} />
          </RLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
