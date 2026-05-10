import { useState } from "react";
import type { WidgetNode } from "../../lib/types";

type Field = { name: string; label: string; type: "text" | "number" | "date" | "select"; options?: string[] };

type Props = {
  node: WidgetNode;
  onAction?: (action: string, args: Record<string, unknown>) => void;
};

export function Form({ node, onAction }: Props) {
  const fields = (node.props?.fields as Field[]) ?? [];
  const submitLabel = (node.props?.submitLabel as string) ?? "Submit";
  const action = (node.props?.action as string) ?? "";
  const [vals, setVals] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    if (!action || pending) return;
    setPending(true);
    try {
      // Coerce numbers where the field declared type=number
      const args: Record<string, unknown> = {};
      for (const f of fields) {
        const raw = vals[f.name];
        if (raw === undefined || raw === "") continue;
        args[f.name] = f.type === "number" ? Number(raw) : raw;
      }
      onAction?.(action, args);
      // Optimistically clear; the chat panel will show the agent reply
      setVals({});
    } finally {
      setPending(false);
    }
  }

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
        onClick={handleSubmit}
        disabled={pending || !action}
        className="w-full rounded-xl bg-emerald-600 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "…" : submitLabel}
      </button>
    </div>
  );
}
