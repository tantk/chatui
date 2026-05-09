import { GoogleGenerativeAI } from "@google/generative-ai";
import { BOOTSTRAP_SYSTEM } from "./prompts";
import { bootstrapResponseSchema, type BootstrapResponse } from "./schema";

let cachedClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (cachedClient) return cachedClient;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  cachedClient = new GoogleGenerativeAI(key);
  return cachedClient;
}

export async function runBootstrap(userMessage: string): Promise<BootstrapResponse> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    systemInstruction: BOOTSTRAP_SYSTEM,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  const parsed = JSON.parse(text);
  return bootstrapResponseSchema.parse(parsed);
}
