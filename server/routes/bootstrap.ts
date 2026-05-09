import { Router } from "express";
import { runBootstrap } from "../agent/bootstrap";

export const bootstrapRouter = Router();

bootstrapRouter.post("/", async (req, res) => {
  const { message } = req.body as { message: string };
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message required" });
  }
  try {
    const blob = await runBootstrap(message);
    res.json({ ...blob, id: crypto.randomUUID(), createdAt: Date.now() });
  } catch (e) {
    console.error("bootstrap error:", e);
    res.status(500).json({ error: (e as Error).message });
  }
});
