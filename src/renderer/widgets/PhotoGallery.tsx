import type { WidgetNode } from "../../lib/types";
import { resolveBinding } from "../bindings";

export function PhotoGallery({ node, data, backendUrl }: { node: WidgetNode; data: Record<string, unknown>; backendUrl: string | null }) {
  const photos = resolveBinding(node.bindings?.photos ?? "$.", data, backendUrl);
  const arr = (Array.isArray(photos) ? photos : []) as Array<{ caption?: string; placeholder?: string }>;
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {arr.map((p, i) => (
        <div key={i} className="aspect-square rounded-lg bg-neutral-800 flex items-center justify-center text-xs text-neutral-500 p-1 text-center">
          {p.placeholder ?? p.caption ?? "📷"}
        </div>
      ))}
    </div>
  );
}
