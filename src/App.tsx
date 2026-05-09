import { useState } from "react";
import { bootstrap } from "./lib/api";
import { Renderer } from "./renderer/Renderer";
import type { App } from "./lib/types";

export default function App() {
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("track my marathon training, 4 runs a week");
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    try {
      const a = await bootstrap(input);
      setApp(a);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6">Generative Phone — smoke UI</h1>
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 rounded bg-neutral-800 px-3 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="rounded bg-green-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
          onClick={go}
          disabled={loading}
        >
          {loading ? "..." : "Generate"}
        </button>
      </div>
      {error && <div className="rounded bg-red-900/40 p-3 text-sm text-red-300">{error}</div>}
      {app && (
        <div className="mt-6 rounded-3xl bg-neutral-950 border border-neutral-800 p-4">
          <div className="mb-3 flex items-center gap-2 text-lg font-medium">
            <span>{app.icon}</span>
            <span>{app.name}</span>
          </div>
          <Renderer tree={app.tree} data={app.data} />
        </div>
      )}
    </div>
  );
}
