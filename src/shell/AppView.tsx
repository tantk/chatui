import { useState } from "react";
import { Renderer } from "../renderer/Renderer";
import { ChatComposer } from "../chat/ChatComposer";
import type { App } from "../lib/types";

type Props = {
  appId: string;
  apps: App[];
  setApps: React.Dispatch<React.SetStateAction<App[]>>;
  onHome: () => void;
};

export function AppView({ appId, apps, onHome }: Props) {
  const app = apps.find((a) => a.id === appId);
  const [pending, setPending] = useState(false);

  if (!app) {
    return <div className="p-6 text-sm text-red-400">App not found</div>;
  }

  async function handleMutate(_msg: string) {
    // wired in Phase 3
    setPending(true);
    setTimeout(() => setPending(false), 500);
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
