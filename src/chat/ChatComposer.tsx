import { useState } from "react";

type Props = { onSubmit: (msg: string) => void; disabled?: boolean };

export function ChatComposer({ onSubmit, disabled }: Props) {
  const [v, setV] = useState("");
  return (
    <div className="p-3 border-t border-neutral-800 flex gap-2">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim() && !disabled) {
            onSubmit(v);
            setV("");
          }
        }}
        disabled={disabled}
        className="flex-1 rounded-2xl bg-neutral-900 px-4 py-2 text-sm disabled:opacity-50"
        placeholder={disabled ? "thinking…" : "say something to this app"}
      />
      <button
        onClick={() => {
          if (v.trim() && !disabled) {
            onSubmit(v);
            setV("");
          }
        }}
        disabled={disabled || !v.trim()}
        className="rounded-2xl bg-emerald-600 px-4 text-sm disabled:opacity-50"
      >
        ↑
      </button>
    </div>
  );
}
