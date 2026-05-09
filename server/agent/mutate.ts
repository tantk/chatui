import { GoogleGenerativeAI, type FunctionDeclarationsTool, type FunctionCall, SchemaType } from "@google/generative-ai";
import type { ToolDeclaration, ChatMessage } from "../../src/lib/types";
import { dispatch } from "./tools/index";
import { MUTATE_SYSTEM } from "./prompts";

const MAX_ITERATIONS = 5;

let cachedClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (cachedClient) return cachedClient;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  cachedClient = new GoogleGenerativeAI(key);
  return cachedClient;
}

// Convert our ToolDeclaration → Gemini's expected schema.
// Gemini SDK uses SchemaType enum for parameter types.
function toGeminiTool(decls: ToolDeclaration[]): FunctionDeclarationsTool {
  const TYPE_MAP: Record<string, SchemaType> = {
    string: SchemaType.STRING,
    number: SchemaType.NUMBER,
    integer: SchemaType.INTEGER,
    boolean: SchemaType.BOOLEAN,
    object: SchemaType.OBJECT,
    array: SchemaType.ARRAY,
  };
  const convertProps = (props: Record<string, any>): Record<string, any> => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(props ?? {})) {
      const t = (v as any)?.type;
      const mapped = TYPE_MAP[t] ?? SchemaType.STRING;
      out[k] = { type: mapped, description: (v as any)?.description };
    }
    return out;
  };
  return {
    functionDeclarations: decls.map((d) => ({
      name: d.name,
      description: d.description,
      parameters: {
        type: SchemaType.OBJECT,
        properties: convertProps(d.parameters.properties as Record<string, any>),
        required: d.parameters.required ?? [],
      },
    })),
  };
}

export type MutateResult = {
  data: Record<string, unknown>;
  reply: string;
  history: ChatMessage[];
};

export async function runMutate(args: {
  message: string;
  tools: ToolDeclaration[];
  data: Record<string, unknown>;
  chatHistory: ChatMessage[];
}): Promise<MutateResult> {
  const workingData = structuredClone(args.data);
  // Map handler name → handler string for dispatch
  const handlerByName = new Map(args.tools.map((t) => [t.name, t.handler]));

  const client = getClient();
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    systemInstruction:
      MUTATE_SYSTEM +
      "\n\n# Current data:\n" +
      JSON.stringify(workingData, null, 2),
    tools: [toGeminiTool(args.tools)],
  });

  // Build SDK-shaped history from our ChatMessage[]
  const sdkHistory = args.chatHistory.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history: sdkHistory });

  let response = (await chat.sendMessage(args.message)).response;
  let finalText = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const calls: FunctionCall[] | undefined = response.functionCalls?.();
    if (!calls || calls.length === 0) {
      finalText = response.text();
      break;
    }

    // Execute every function call against workingData
    const fnResponseParts = calls.map((call) => {
      const handler = handlerByName.get(call.name);
      let result: unknown;
      try {
        if (!handler) throw new Error(`no handler for tool: ${call.name}`);
        result = dispatch(handler, call.args ?? {}, workingData);
      } catch (e) {
        result = { ok: false, error: (e as Error).message };
      }
      return {
        functionResponse: {
          name: call.name,
          response: result as object,
        },
      };
    });

    response = (await chat.sendMessage(fnResponseParts)).response;
  }

  if (!finalText) finalText = "(done)";

  const newHistory: ChatMessage[] = [
    ...args.chatHistory,
    { role: "user", content: args.message, ts: Date.now() },
    { role: "assistant", content: finalText, ts: Date.now() },
  ];

  return { data: workingData, reply: finalText, history: newHistory };
}
