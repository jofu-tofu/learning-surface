import { z } from 'zod';

// === Internal Validators (used by tool handler, not exposed as tools) ===

/** Diagram node/edge validation — used inside design_surface handler. */
export const DiagramNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  shape: z.enum(['rectangle', 'rounded', 'diamond', 'circle']).optional(),
  category: z.enum(['input', 'process', 'output', 'decision', 'concept', 'warning']).optional(),
  description: z.string().optional(),
  emphasis: z.enum(['normal', 'highlighted', 'dimmed']).optional(),
  group: z.string().optional(),
});

export const DiagramDataSchema = z.object({
  nodes: z.array(DiagramNodeSchema),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string().optional(),
  })),
  direction: z.enum(['TB', 'LR']).optional(),
});

export const TimelineDataSchema = z.object({
  events: z.array(z.object({
    id: z.string(),
    date: z.string(),
    label: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
  })),
  direction: z.enum(['horizontal', 'vertical']).optional(),
});

export const ProofDataSchema = z.object({
  title: z.string().optional(),
  premises: z.array(z.string()).optional(),
  steps: z.array(z.object({
    expression: z.string(),
    justification: z.string(),
    isGoal: z.boolean().optional(),
  })),
});

// === design_surface Schema ===

const CanvasInputSchema = z.object({
  id: z.string(),
  type: z.enum(['mermaid', 'katex', 'code', 'diagram', 'timeline', 'proof']),
  content: z.string(),
  language: z.string().optional(),
});

const CheckInputSchema = z.object({
  question: z.string(),
  hints: z.array(z.string()).optional(),
  answer: z.string(),
  answerExplanation: z.string().optional(),
});

const SectionUpdateSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  active: z.boolean().optional(),
  canvases: z.array(CanvasInputSchema).optional(),
  explanation: z.string().optional(),
  checks: z.array(CheckInputSchema).optional(),
  followups: z.array(z.string()).optional(),
  clear: z.array(z.enum(['canvases', 'explanation', 'checks', 'followups'])).optional(),
});

export const DesignSurfaceSchema = z.object({
  sections: z.array(SectionUpdateSchema).optional(),
  removeSection: z.string().optional(),
  clearAll: z.boolean().optional(),
});

export type DesignSurfaceInput = z.infer<typeof DesignSurfaceSchema>;
export type SectionUpdateInput = z.infer<typeof SectionUpdateSchema>;
export type CanvasInput = z.infer<typeof CanvasInputSchema>;
export type CheckInput = z.infer<typeof CheckInputSchema>;

// === Tool Definitions ===

export interface ToolDefinitionEntry {
  name: string;
  /** Human-readable label for frontend activity status during processing. */
  label: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
}

export const TOOL_DEFS = [
  {
    name: 'design_surface',
    label: 'Designing surface',
    description: 'Declarative batch tool: create sections, set canvases, explain, challenge, clear, navigate. Each section entry targets by id (existing) or creates by title (new). Within a section: canvases upsert by id (max 4), explanation replaces, checks append, followups replace, clear deletes panes before applying. Partial success: invalid fields return errors, valid fields still apply.',
    schema: DesignSurfaceSchema,
  },
] as const satisfies readonly ToolDefinitionEntry[];

/** Union of all tool name literals. */
export type ToolName = typeof TOOL_DEFS[number]['name'];

// === Schema Lookup Map ===

export const toolSchemaMap = new Map<string, z.ZodObject<z.ZodRawShape>>();
for (const toolDef of TOOL_DEFS) {
  toolSchemaMap.set(toolDef.name, toolDef.schema);
}

// === JSON Schema Conversion ===

/** Convert a Zod field to a JSON Schema property descriptor. */
function zodFieldToJsonSchema(field: z.ZodTypeAny): Record<string, unknown> {
  // Unwrap optionals
  if (field instanceof z.ZodOptional) {
    return zodFieldToJsonSchema(field.unwrap());
  }

  if (field instanceof z.ZodString) {
    return { type: 'string' };
  }

  if (field instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }

  if (field instanceof z.ZodEnum) {
    return { type: 'string', enum: field.options };
  }

  if (field instanceof z.ZodArray) {
    return { type: 'array', items: zodFieldToJsonSchema(field.element) };
  }

  if (field instanceof z.ZodObject) {
    return zodToJsonSchema(field);
  }

  // Fallback
  return { type: 'string' };
}

/** Convert a flat Zod object schema to JSON Schema for MCP tool registration. */
export function zodToJsonSchema(schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
  const shape = schema.shape;
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const [propertyName, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny;
    properties[propertyName] = zodFieldToJsonSchema(zodType);
    if (!zodType.isOptional()) {
      required.push(propertyName);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}
