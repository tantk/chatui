import { useEffect, useState } from "react";
import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { WidgetNode } from "../../lib/types";
import { resolveBinding } from "../bindings";

type Props = { node: WidgetNode; data: Record<string, unknown>; backendUrl: string | null };

export function LineChart({ node, data, backendUrl }: Props) {
  const expr = node.bindings?.data ?? "$.";
  const resolved = resolveBinding(expr, data, backendUrl);

  // Live fetch path: when resolved is a URL string (because expr was $BACKEND/...)
  const [live, setLive] = useState<unknown>(undefined);
  useEffect(() => {
    if (typeof resolved !== "string" || !resolved.startsWith("http")) return;
    let cancelled = false;
    fetch(resolved)
      .then((r) => r.json())
      .then((j) => !cancelled && setLive(j))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [resolved]);

  // Pick best data source in order: live response > resolved seed > seed.weeks fallback
  const isUrlExpr = typeof expr === "string" && expr.startsWith("$BACKEND/");
  const seedFallback = isUrlExpr ? (data as { weeks?: unknown }).weeks : undefined;
  const final = live ?? (typeof resolved === "string" ? seedFallback : resolved ?? seedFallback);
  // Accept either a flat array or { weeks: [...] }
  const arr = Array.isArray(final)
    ? final
    : Array.isArray((final as { weeks?: unknown } | undefined)?.weeks)
    ? ((final as { weeks: unknown[] }).weeks)
    : [];

  return (
    <div className="rounded-2xl bg-neutral-900 p-4 relative">
      {live != null && (
        <div className="absolute top-2 right-3 text-[9px] uppercase tracking-wide text-emerald-400">
          live
        </div>
      )}
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
