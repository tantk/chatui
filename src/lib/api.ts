import type { App } from "./types";

export async function bootstrap(message: string): Promise<App> {
  const r = await fetch("/api/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!r.ok) throw new Error(`bootstrap ${r.status}: ${await r.text()}`);
  const blob = await r.json();
  return {
    ...blob,
    chatHistory: [{ role: "user", content: message, ts: Date.now() }],
    backendUrl: null,
    backendStatus: "none" as const,
  };
}
