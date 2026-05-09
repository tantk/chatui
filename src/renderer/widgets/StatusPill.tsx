import type { WidgetNode } from "../../lib/types";

const TONES = {
  neutral: "bg-neutral-700 text-neutral-200",
  positive: "bg-emerald-600/30 text-emerald-300",
  warning: "bg-amber-600/30 text-amber-300",
  danger: "bg-red-600/30 text-red-300",
} as const;

export function StatusPill({ node }: { node: WidgetNode }) {
  const label = (node.props?.label as string) ?? "";
  const tone = (node.props?.tone as keyof typeof TONES) ?? "neutral";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${TONES[tone]}`}>
      {label}
    </span>
  );
}
