import { useState } from "react";

type Props = {
  onSubmit: (msg: string) => void;
  onBack: () => void;
};

export function NewChatScreen({ onSubmit, onBack }: Props) {
  const [msg, setMsg] = useState("");
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 flex items-center gap-3 p-3 border-b border-neutral-800">
        <button onClick={onBack} className="text-neutral-400 text-sm">‹ Home</button>
        <span className="text-sm">New Chat</span>
      </div>
      <div className="flex-1 min-h-0 p-4 flex items-end overflow-y-auto">
        <div className="text-sm text-neutral-500">
          What do you want help with? I'll build you an app for it.
        </div>
      </div>
      <div className="shrink-0 p-3 border-t border-neutral-800 flex gap-2">
        <input
          autoFocus
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && msg.trim() && onSubmit(msg)}
          className="flex-1 rounded-2xl bg-neutral-900 px-4 py-2 text-sm"
          placeholder="e.g. track my marathon training"
        />
        <button
          onClick={() => msg.trim() && onSubmit(msg)}
          disabled={!msg.trim()}
          className="rounded-2xl bg-emerald-600 px-4 text-sm disabled:opacity-50"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
