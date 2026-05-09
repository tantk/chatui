import { z } from "zod";

// One node in the layout tree. Recursive via z.lazy.
export const widgetSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    type: z.string(),
    id: z.string().optional(),
    props: z.record(z.unknown()).optional(),
    bindings: z.record(z.string()).optional(),
    children: z.array(widgetSchema).optional(),
  })
);

export const toolDeclarationSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.object({
    type: z.literal("object"),
    properties: z.record(z.unknown()),
    required: z.array(z.string()).optional(),
  }),
  handler: z.string(),
});

export const bootstrapResponseSchema = z.object({
  name: z.string().min(1).max(40),
  icon: z.string().min(1).max(8),
  appType: z.enum(["marathon", "trip", "jobs", "generic"]),
  tree: widgetSchema,
  data: z.record(z.unknown()),
  tools: z.array(toolDeclarationSchema).min(1),
  backendCode: z.string().nullable(),
});

export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>;
