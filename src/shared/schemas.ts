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
    edgeType: z.enum(['solid', 'dashed', 'dotted']).optional(),
    sourceLabel: z.string().optional(),
    targetLabel: z.string().optional(),
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

export const SequenceDataSchema = z.object({
  participants: z.array(z.object({
    id: z.string(),
    label: z.string(),
  })),
  messages: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string().optional(),
    type: z.enum(['solid', 'dashed']).optional(),
    group: z.string().optional(),
  })),
});

// === design_surface Schema ===

const CanvasInputSchema = z.object({
  id: z.string(),
  type: z.enum(['katex', 'code', 'diagram', 'timeline', 'proof', 'sequence']),
  content: z.string().describe(
    'diagram: JSON {nodes: [{id, label, shape?: "rectangle"|"rounded"|"diamond"|"circle", category?: "input"|"process"|"output"|"decision"|"concept"|"warning", description?, emphasis?: "normal"|"highlighted"|"dimmed", group?}], edges: [{from, to, label?, edgeType?: "solid"|"dashed"|"dotted", sourceLabel?, targetLabel?}], direction?: "TB"|"LR"}. ' +
    'sequence: JSON {participants: [{id, label}], messages: [{from, to, label?, type?: "solid"|"dashed", group?}]}. ' +
    'timeline: JSON {events: [{id, date, label, description?, category?}], direction?: "horizontal"|"vertical"}. ' +
    'proof: JSON {title?, premises?: string[], steps: [{expression, justification, isGoal?}]}. ' +
    'katex: raw LaTeX string. code: raw source code (set language field).',
  ),
  language: z.string().optional().describe('Programming language for code canvases (e.g. "typescript", "python").'),
});

const CheckInputSchema = z.object({
  question: z.string(),
  hints: z.array(z.string()).optional(),
  answer: z.string(),
  answerExplanation: z.string().optional(),
});

const DeeperPatternInputSchema = z.object({
  pattern: z.string().describe('The recurring or universal concept (e.g. "Feedback loops", "Divide and conquer", "Graph traversal").'),
  connection: z.string().describe('1-2 sentences explaining how this topic uses or relates to the pattern — bridge from what the learner likely already knows to the new material.'),
});

const SectionUpdateSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  active: z.boolean().optional(),
  canvases: z.array(CanvasInputSchema).optional(),
  explanation: z.string().optional(),
  deeperPatterns: z.array(DeeperPatternInputSchema).optional(),
  checks: z.array(CheckInputSchema).optional(),
  followups: z.array(z.string()).optional(),
  clear: z.array(z.enum(['canvases', 'explanation', 'deeperPatterns', 'checks', 'followups'])).optional(),
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
    description: 'Declarative batch tool: create sections, set canvases, explain, challenge, clear, navigate. Each section entry targets by id (existing) or creates by title (new). Within a section: canvases upsert by id (max 4), explanation replaces, deeperPatterns replaces, checks append, followups replace, clear deletes panes before applying. Partial success: invalid fields return errors, valid fields still apply.',
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

  let result: Record<string, unknown>;

  if (field instanceof z.ZodString) {
    result = { type: 'string' };
  } else if (field instanceof z.ZodBoolean) {
    result = { type: 'boolean' };
  } else if (field instanceof z.ZodEnum) {
    result = { type: 'string', enum: field.options };
  } else if (field instanceof z.ZodArray) {
    result = { type: 'array', items: zodFieldToJsonSchema(field.element) };
  } else if (field instanceof z.ZodObject) {
    result = zodToJsonSchema(field);
  } else {
    result = { type: 'string' };
  }

  if (field.description) {
    result.description = field.description;
  }

  return result;
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
