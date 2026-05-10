import type { WidgetNode } from "../../lib/types";

type Props = {
  node: WidgetNode;
  onAction?: (action: string, args: Record<string, unknown>) => void;
};

export function Button({ node, onAction }: Props) {
  const label = (node.props?.label as string) ?? "Button";
  const action = (node.props?.action as string) ?? "";
  return (
    <button
      onClick={() => action && onAction?.(action, {})}
      disabled={!action}
      className="rounded-xl bg-emerald-600 px-4 py-1.5 text-sm font-medium disabled:opacity-50"
    >
      {label}
    </button>
  );
}
