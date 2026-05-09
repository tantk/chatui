export type WidgetNode = {
  type: string;
  id?: string;
  props?: Record<string, unknown>;
  bindings?: Record<string, string>;
  children?: WidgetNode[];
};

export type ToolDeclaration = {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  handler: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  ts: number;
};

export type App = {
  id: string;
  createdAt: number;
  name: string;
  icon: string;
  appType: "marathon" | "trip" | "jobs" | "generic";
  tree: WidgetNode;
  data: Record<string, unknown>;
  tools: ToolDeclaration[];
  chatHistory: ChatMessage[];
  backendUrl: string | null;
  backendStatus: "none" | "provisioning" | "ready" | "failed";
};
