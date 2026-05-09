import { marathon } from "./marathon";
import { trip } from "./trip";
import { jobs } from "./jobs";

const REGISTRY = { marathon, trip, jobs } as Record<string, Record<string, (a: any, d: any) => any>>;

export function dispatch(handler: string, args: unknown, data: Record<string, unknown>): unknown {
  const [ns, name] = handler.split(".");
  const fn = REGISTRY[ns]?.[name];
  if (!fn) throw new Error(`unknown tool handler: ${handler}`);
  return fn(args as any, data);
}
