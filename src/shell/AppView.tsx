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

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 p-3 border-b border-neutral-800">
        <button onClick={onHome} className="text-neutral-400 text-sm">‹ Home</button>
        <span className="text-2xl">{app.icon}</span>
        <span className="text-sm">{app.name}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Renderer tree={app.tree} data={app.data} backendUrl={app.backendUrl} />
      </div>
      <ChatComposer onSubmit={handleMutate} disabled={pending} />
    </div>
  );
}
