import type { WidgetNode } from "../../lib/types";

type Props = {
  node: WidgetNode;
  renderChild: (n: WidgetNode) => JSX.Element;
};

export function Container({ node, renderChild }: Props) {
  const layout = (node.props?.layout as string) || "stack";
  const gap = (node.props?.gap as number) ?? 16;
  const cls =
    layout === "row"
      ? "flex flex-row"
      : layout === "grid"
      ? "grid grid-cols-2"
      : "flex flex-col";
  return (
    <div className={cls} style={{ gap }}>
      {(node.children ?? []).map((c, i) => (
        <div key={c.id ?? i}>{renderChild(c)}</div>
      ))}
    </div>
  );
}
