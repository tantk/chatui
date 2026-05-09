import { z } from "zod";

export const widgetSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.string(),
    id: z.string().optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    bindings: z.record(z.string(), z.string()).optional(),
    children: z.array(widgetSchema).optional(),
  })
);
