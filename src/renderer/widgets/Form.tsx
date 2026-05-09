import { useState } from "react";
import type { WidgetNode } from "../../lib/types";

type Field = { name: string; label: string; type: "text" | "number" | "date" | "select"; options?: string[] };

export function Form({ node }: { node: WidgetNode }) {
  const fields = (node.props?.fields as Field[]) ?? [];
  const submitLabel = (node.props?.submitLabel as string) ?? "Submit";
  const action = node.props?.action as string | undefined;
  const [vals, setVals] = useState<Record<string, string>>({});

  return (
    <div className="rounded-2xl bg-neutral-900 p-4 space-y-3">
      {fields.map((f) => (
        <div key={f.name}>
          <label className="block text-[10px] uppercase tracking-wide text-neutral-400 mb-1">{f.label}</label>
          {f.type === "select" ? (
            <select
              className="w-full rounded bg-neutral-800 px-2 py-1 text-sm"
              value={vals[f.name] ?? ""}
              onChange={(e) => setVals((v) => ({ ...v, [f.name]: e.target.value }))}
            >
              <option value="">—</option>
              {(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type={f.type}
              className="w-full rounded bg-neutral-800 px-2 py-1 text-sm"
              value={vals[f.name] ?? ""}
              onChange={(e) => setVals((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          )}
        </div>
      ))}
      <button
        onClick={() => alert(`(stub) would call action: ${action ?? "—"} with ${JSON.stringify(vals)}`)}
        className="w-full rounded-xl bg-emerald-600 py-1.5 text-sm font-medium"
      >
        {submitLabel}
      </button>
    </div>
  );
}
