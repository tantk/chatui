import type { WidgetNode } from "../lib/types";
import { WIDGETS } from "./widgets";

type Props = { tree: WidgetNode; data: Record<string, unknown>; backendUrl?: string | null };

export function Renderer({ tree, data, backendUrl = null }: Props) {
  function renderNode(node: WidgetNode): JSX.Element {
    const Comp = WIDGETS[node.type];
    if (!Comp) {
      return (
        <div className="rounded bg-amber-900/30 p-2 text-xs text-amber-300">
          Unknown widget: {node.type}
        </div>
      );
    }
    return <Comp node={node} data={data} backendUrl={backendUrl} renderChild={renderNode} />;
  }
  return <div className="p-4">{renderNode(tree)}</div>;
}
