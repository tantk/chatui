import type { WidgetNode } from "../../lib/types";

export function Button({ node }: { node: WidgetNode }) {
  const label = (node.props?.label as string) ?? "Button";
  const action = node.props?.action as string | undefined;
  return (
    <button
      onClick={() => alert(`(stub) would call action: ${action ?? "—"}`)}
      className="rounded-xl bg-emerald-600 px-4 py-1.5 text-sm font-medium"
    >
      {label}
    </button>
  );
}
