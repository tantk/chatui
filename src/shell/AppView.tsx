import { useState } from "react";
import { Renderer } from "../renderer/Renderer";
import { ChatComposer } from "../chat/ChatComposer";
import { mutate } from "../lib/api";
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
