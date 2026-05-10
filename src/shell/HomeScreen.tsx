import type { App } from "../lib/types";

type Props = {
  apps: App[];
  onOpen: (id: string) => void;
  onNewChat: () => void;
};

export function HomeScreen({ apps, onOpen, onNewChat }: Props) {
  return (
    <div className="flex-1 min-h-0 p-6 overflow-y-auto">
      <h1 className="text-xs uppercase tracking-widest text-neutral-500 mb-6">Phone</h1>
      <div className="grid grid-cols-4 gap-5">
        <button
          onClick={onNewChat}
          className="flex flex-col items-center gap-1.5"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-2xl">
            ＋
          </div>
          <span className="text-[11px] text-neutral-300">New Chat</span>
        </button>
        {apps.map((a) => (
          <button
            key={a.id}
            onClick={() => onOpen(a.id)}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="w-14 h-14 rounded-2xl bg-neutral-800 flex items-center justify-center text-2xl">
              {a.icon}
            </div>
            <span className="text-[11px] text-neutral-300 truncate w-16 text-center">
              {a.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
