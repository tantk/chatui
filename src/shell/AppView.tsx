import { useCallback, useEffect, useRef, useState } from "react";
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

const CHAT_PANEL_DEFAULT_PX = 120;
const CHAT_PANEL_MIN_PX = 36;       // just the drag handle visible
const CHAT_PANEL_MAX_RATIO = 0.75;  // up to 75% of the phone body

export function AppView({ appId, apps, setApps, onHome }: Props) {
  const app = apps.find((a) => a.id === appId);
  const [pending, setPending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatHeightPx, setChatHeightPx] = useState(CHAT_PANEL_DEFAULT_PX);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ startY: number; startH: number } | null>(null);

  const beginDrag = useCallback((clientY: number) => {
    dragStateRef.current = { startY: clientY, startH: chatHeightPx };
  }, [chatHeightPx]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const ds = dragStateRef.current;
    if (!ds) return;
    const dy = ds.startY - e.clientY; // dragging UP makes dy positive
    const containerH = containerRef.current?.clientHeight ?? 700;
    const max = Math.max(CHAT_PANEL_MIN_PX + 80, containerH * CHAT_PANEL_MAX_RATIO);
    const next = Math.min(max, Math.max(CHAT_PANEL_MIN_PX, ds.startH + dy));
    setChatHeightPx(next);
  }, []);

  const onPointerUp = useCallback(() => {
    dragStateRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    beginDrag(e.clientY);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }, [beginDrag, onPointerMove, onPointerUp]);

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
        tree: app.tree,
        chatHistory: app.chatHistory,
      });
      setApps((prev) =>
        prev.map((a) =>
          a.id === app.id
            ? { ...a, data: result.data, tree: result.tree, chatHistory: result.history }
            : a
        )
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  // Last 4 chat messages (2 turns) shown above the composer in app view
  const recentChat = app.chatHistory.slice(-4);
  const historyCount = app.chatHistory.length;

  // History view replaces the app view entirely
  if (historyOpen) {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="shrink-0 flex items-center gap-3 p-3 border-b border-neutral-800">
          <button onClick={() => setHistoryOpen(false)} className="text-neutral-400 text-sm">
            ‹ Back
          </button>
          <span className="text-2xl">{app.icon}</span>
          <div className="flex-1">
            <div className="text-sm">{app.name}</div>
            <div className="text-[10px] text-neutral-500">{historyCount} messages</div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
          {app.chatHistory.length === 0 && (
            <div className="text-xs text-neutral-500 text-center mt-8">
              No messages yet. Type below to start.
            </div>
          )}
          {app.chatHistory.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "text-xs text-neutral-200 bg-neutral-800 rounded-2xl rounded-br-sm px-3 py-1.5 ml-auto max-w-[85%] w-fit"
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
        <div className="shrink-0">
          <ChatComposer onSubmit={handleMutate} disabled={pending} />
        </div>
      </div>
    );
  }

  const showChatPanel = recentChat.length > 0 || pending;

  return (
    <div ref={containerRef} className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 flex items-center gap-3 p-3 border-b border-neutral-800">
        <button onClick={onHome} className="text-neutral-400 text-sm">‹ Home</button>
        <span className="text-2xl">{app.icon}</span>
        <span className="text-sm flex-1">{app.name}</span>
        <button
          onClick={() => setHistoryOpen(true)}
          className="text-neutral-400 text-lg leading-none px-1.5 py-0.5 rounded hover:bg-neutral-800 relative"
          aria-label="Chat history"
        >
          ☰
          {historyCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-[9px] text-black rounded-full min-w-4 h-4 flex items-center justify-center px-1">
              {historyCount > 99 ? "99+" : historyCount}
            </span>
          )}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Renderer tree={app.tree} data={app.data} backendUrl={app.backendUrl} />
      </div>
      {showChatPanel && (
        <div
          className="shrink-0 flex flex-col border-t border-neutral-800 bg-neutral-950/80"
          style={{ height: `${chatHeightPx}px` }}
        >
          <div
            onPointerDown={onHandlePointerDown}
            onDoubleClick={() => setChatHeightPx(CHAT_PANEL_DEFAULT_PX)}
            className="shrink-0 h-2.5 flex items-center justify-center cursor-row-resize select-none touch-none hover:bg-neutral-800/40"
            aria-label="Resize chat panel"
            role="separator"
          >
            <div className="w-10 h-1 rounded-full bg-neutral-600" />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5">
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
        </div>
      )}
      <div className="shrink-0">
        <ChatComposer onSubmit={handleMutate} disabled={pending} />
      </div>
    </div>
  );
}
