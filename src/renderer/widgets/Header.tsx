import type { WidgetNode } from "../../lib/types";

export function Header({ node }: { node: WidgetNode }) {
  const text = (node.props?.text as string) || "";
  const level = (node.props?.level as number) || 1;
  const cls =
    level === 1 ? "text-2xl font-semibold" : level === 2 ? "text-xl font-semibold" : "text-lg font-medium";
  return <h1 className={cls}>{text}</h1>;
}
