import { useEffect, useState } from "react";
import { Renderer } from "../renderer/Renderer";
import { ChatComposer } from "../chat/ChatComposer";
import { mutate, pollBackend } from "../lib/api";
import type { App } from "../lib/types";

type Props = {
  appId: string;
  apps: App[];
  setApps: React.Dispatch<React.SetStateAction<App[]>>;
  onHome: () => void;
};

export function AppView({ appId, apps, setApps, onHome }: Props) {
  const app = apps.find((a) => a.id === appId);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!app || app.backendStatus !== "provisioning") return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const s = await pollBackend(app.id);
        if (cancelled) return;
        if (s.state === "ready" && s.url) {
          setApps((prev) =>
            prev.map((a) =>
              a.id === app.id
                ? { ...a, backendUrl: s.url!, backendStatus: "ready" as const }
                : a
            )
          );
        } else if (s.state === "failed") {
          setApps((prev) =>
            prev.map((a) =>
              a.id === app.id ? { ...a, backendStatus: "failed" as const } : a
            )
          );
        }
      } catch {
        /* ignore, retry */
      }
    };
    const interval = setInterval(tick, 2000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [app?.id, app?.backendStatus, setApps]);

  if (!app) {
    return <div className="p-6 text-sm text-red-400">App not found</div>;
  }

  async function handleMutate(msg: string) {
    if (!app) return;
    setPending(true);
    try {
      const result = await mutate({
        message: msg,
        tools: app.tools,
        data: app.data,
        chatHistory: app.chatHistory,
      });
      setApps((prev) =>
        prev.map((a) =>
          a.id === app.id ? { ...a, data: result.data, chatHistory: result.history } : a
        )
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  // Show the last 4 chat messages (2 turns) above the composer
  const recentChat = app.chatHistory.slice(-4);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 flex items-center gap-3 p-3 border-b border-neutral-800">
        <button onClick={onHome} className="text-neutral-400 text-sm">‹ Home</button>
        <span className="text-2xl">{app.icon}</span>
        <span className="text-sm">{app.name}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Renderer tree={app.tree} data={app.data} backendUrl={app.backendUrl} />
      </div>
      {(recentChat.length > 0 || pending) && (
        <div className="shrink-0 max-h-[35%] overflow-y-auto border-t border-neutral-800 bg-neutral-950/80 px-3 py-2 space-y-1.5">
          {recentChat.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "text-xs text-neutral-300 bg-neutral-800 rounded-2xl rounded-br-sm px-3 py-1.5 ml-auto max-w-[85%] w-fit"
                  : "text-xs text-emerald-100 bg-emerald-900/40 rounded-2xl rounded-bl-sm px-3 py-1.5 max-w-[85%] w-fit"
              }
            >
              {m.content}
            </div>
          ))}
          {pending && (
            <div className="text-xs text-neutral-500 px-3 py-1.5">thinking…</div>
          )}
        </div>
      )}
      <div className="shrink-0">
        <ChatComposer onSubmit={handleMutate} disabled={pending} />
      </div>
    </div>
  );
}
