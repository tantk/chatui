import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import type { WidgetNode } from "../../lib/types";
import { resolveBinding } from "../bindings";

export function Calendar({ node, data, backendUrl }: { node: WidgetNode; data: Record<string, unknown>; backendUrl: string | null }) {
  const events = resolveBinding(node.bindings?.events ?? "$.", data, backendUrl);
  const arr = (Array.isArray(events) ? events : []) as Array<{ date: string }>;
  const dates = arr.map((e) => new Date(e.date)).filter((d) => !isNaN(d.getTime()));
  return (
    <div className="rounded-2xl bg-neutral-900 p-3 text-xs">
      <DayPicker mode="multiple" selected={dates} className="text-neutral-200" />
    </div>
  );
}
