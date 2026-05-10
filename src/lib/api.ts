import type { App, ChatMessage, ToolDeclaration } from "./types";

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

export async function pollBackend(
  appId: string
): Promise<{ state: string; url?: string; error?: string }> {
  const r = await fetch(`/api/app/${appId}/backend`);
  if (!r.ok) throw new Error(`poll ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function mutate(args: {
  message: string;
  tools: ToolDeclaration[];
  data: Record<string, unknown>;
  chatHistory: ChatMessage[];
}): Promise<{ data: Record<string, unknown>; reply: string; history: ChatMessage[] }> {
  const r = await fetch("/api/mutate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`mutate ${r.status}: ${await r.text()}`);
  return r.json();
}
