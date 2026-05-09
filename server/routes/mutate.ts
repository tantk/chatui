import { Router } from "express";
import { runMutate } from "../agent/mutate";

export const mutateRouter = Router();

mutateRouter.post("/", async (req, res) => {
  const body = req.body as {
    message: string;
    tools: any[];
    data: Record<string, unknown>;
    chatHistory: { role: "user" | "assistant"; content: string; ts: number }[];
  };
  if (!body.message || !Array.isArray(body.tools)) {
    return res.status(400).json({ error: "missing message or tools" });
  }
  try {
    const result = await runMutate(body);
    res.json(result);
  } catch (e) {
    console.error("mutate error:", e);
    res.status(500).json({ error: (e as Error).message });
  }
});
