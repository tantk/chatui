import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import express from "express";
import path from "node:path";
import { bootstrapRouter } from "./routes/bootstrap";
import { mutateRouter } from "./routes/mutate";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use("/api/bootstrap", bootstrapRouter);
app.use("/api/mutate", mutateRouter);

const distDir = path.resolve("dist");
app.use(express.static(distDir));
app.get("/*splat", (_req, res) => res.sendFile(path.join(distDir, "index.html")));

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => console.log(`server on :${port}`));
