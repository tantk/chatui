import * as dotenv from "dotenv";
// Load .env.local first (preferred), fall back to .env
dotenv.config({ path: ".env.local" });
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";
import { bootstrapResponseSchema } from "../../server/agent/schema.js";
import { BOOTSTRAP_SYSTEM } from "../../server/agent/prompts.js";

const PROMPTS = [
  "I'm training for the Boston marathon in October, I run 4 times a week",
  "Plan my Japan honeymoon, two weeks, Tokyo and Kyoto",
  "Track my software engineering job applications",
];

async function runOne(client: GoogleGenerativeAI, modelName: string, message: string): Promise<boolean> {
  console.log(`\n→ Prompt: "${message}"`);
  const t0 = Date.now();

  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: BOOTSTRAP_SYSTEM,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(message);
  const text = result.response.text();
  const elapsed = Date.now() - t0;
  console.log(`← ${text.length} chars in ${elapsed}ms`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    console.error("❌ JSON parse failed");
    console.error(text.slice(0, 500));
    return false;
  }

  const v = bootstrapResponseSchema.safeParse(parsed);
  if (!v.success) {
    console.error("❌ Schema validation failed:");
    console.error(JSON.stringify(v.error.flatten(), null, 2));
    console.error("Response was:", text.slice(0, 500));
    return false;
  }

  const r = v.data;
  console.log(`  ✅ name=${r.name} icon=${r.icon} appType=${r.appType}`);
  console.log(`     root widget=${(r.tree as any).type} tools=[${r.tools.map((t) => t.name).join(", ")}] data keys=[${Object.keys(r.data).join(", ")}]`);
  return true;
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not set");
    process.exit(1);
  }
  const modelName = process.env.GEMINI_MODEL || "gemini-3-pro-preview";
  console.log(`Using model: ${modelName}`);

  const client = new GoogleGenerativeAI(apiKey);

  const results: boolean[] = [];
  for (const p of PROMPTS) {
    try {
      results.push(await runOne(client, modelName, p));
    } catch (e) {
      console.error("❌ Threw:", (e as Error).message);
      results.push(false);
    }
  }

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} prompts passed`);
  process.exit(passed === results.length ? 0 : 2);
}

main();
