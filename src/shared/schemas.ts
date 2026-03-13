import { z } from 'zod';

// === Zod Schemas for MCP Tool Parameters ===

export const ShowVisualSchema = z.object({
  type: z.enum(['mermaid', 'katex', 'code']),
  content: z.string(),
  language: z.string().optional(),
});

const ShowDiagramSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    shape: z.enum(['rectangle', 'rounded', 'diamond', 'circle']).optional(),
    category: z.enum(['input', 'process', 'output', 'decision', 'concept', 'warning']).optional(),
    description: z.string().optional(),
    emphasis: z.enum(['normal', 'highlighted', 'dimmed']).optional(),
    group: z.string().optional(),
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string().optional(),
  })),
  direction: z.enum(['TB', 'LR']).optional(),
});

export const BuildVisualSchema = z.object({
  additions: z.string(),
});

export const ExplainSchema = z.object({
  content: z.string(),
});

export const ExtendSchema = z.object({
  content: z.string(),
});

export const ChallengeSchema = z.object({
  question: z.string(),
  hints: z.array(z.string()).optional(),
  answer: z.string().optional(),
  answerExplanation: z.string().optional(),
});

export const SuggestFollowupsSchema = z.object({
  questions: z.array(z.string()),
});

export const NewSectionSchema = z.object({
  title: z.string(),
});

export const SetActiveSchema = z.object({
  section: z.string(),
});

export const ClearSchema = z.object({
  target: z.enum(['canvas', 'explanation', 'checks', 'followups', 'section', 'all']),
  section: z.string().optional(),
});

// === Tool Definitions ===

interface ToolDef {
  name: string;
  /** Human-readable label for frontend activity status during processing. */
  label: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
}

export const TOOL_DEFS = [
  {
    name: 'show_diagram',
    label: 'Building diagram',
    description: 'Show a diagram on the canvas. Replaces any existing visual in the active section. Pass nodes (boxes) and edges (arrows between them) — the surface handles layout and rendering. Use category to color-code nodes by role (input=blue, process=green, output=orange, decision=yellow, concept=purple, warning=red). Add description for tooltip details shown on hover. Use emphasis to highlight or dim nodes. Use group to visually cluster related nodes. Set direction to LR for process flows or TB (default) for hierarchies.',
    schema: ShowDiagramSchema,
  },
  {
    name: 'show_visual',
    label: 'Building visual',
    description: 'Replace the canvas pane with a Mermaid diagram, KaTeX math, or syntax-highlighted code. Erases any existing visual in the active section. For code, set language for highlighting.',
    schema: ShowVisualSchema,
  },
  {
    name: 'build_visual',
    label: 'Extending visual',
    description: 'Append content to the existing canvas visual line by line. Requires a prior show_visual — does nothing if the canvas is empty.',
    schema: BuildVisualSchema,
  },
  {
    name: 'explain',
    label: 'Writing explanation',
    description: 'Replace the explanation pane with new content. Erases any existing explanation in the active section.',
    schema: ExplainSchema,
  },
  {
    name: 'extend',
    label: 'Extending explanation',
    description: 'Append content to the existing explanation. Creates the explanation if it does not exist yet.',
    schema: ExtendSchema,
  },
  {
    name: 'challenge',
    label: 'Adding comprehension check',
    description: 'Add a new comprehension check question to the active section. Each call adds one question (does not replace existing checks). Provide optional hints for the learner. Provide answer and answerExplanation so the learner can reveal the answer after attempting the question — answers are hidden by default.',
    schema: ChallengeSchema,
  },
  {
    name: 'suggest_followups',
    label: 'Suggesting follow-ups',
    description: 'Replace the follow-up questions list in the active section. Overwrites any existing follow-ups.',
    schema: SuggestFollowupsSchema,
  },
  {
    name: 'new_section',
    label: 'Creating section',
    description: 'Create a new learning section. The section is added but does not become active — call set_active to switch to it. The section ID is the slugified title.',
    schema: NewSectionSchema,
  },
  {
    name: 'set_active',
    label: 'Switching section',
    description: 'Switch the active section by its section ID (slugified title). All content tools (show_visual, explain, etc.) operate on the active section.',
    schema: SetActiveSchema,
  },
  {
    name: 'clear',
    label: 'Clearing content',
    description: 'Erase content from the learning surface. Target a specific pane (canvas, explanation, checks, followups) in the active section, remove an entire section, or use "all" to wipe the entire document and start fresh. Defaults to the active section; pass section ID to target a different one. Cannot remove the last remaining section (use "all" instead to reset everything).',
    schema: ClearSchema,
  },
] as const satisfies readonly ToolDef[];

/** Union of all tool name literals — use in Record types for compile-time completeness checks. */
export type ToolName = typeof TOOL_DEFS[number]['name'];

// === Schema Lookup Map ===

export const toolSchemaMap = new Map<string, z.ZodObject<z.ZodRawShape>>();
for (const def of TOOL_DEFS) {
  toolSchemaMap.set(def.name, def.schema);
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

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny;
    properties[key] = zodFieldToJsonSchema(zodType);
    if (!zodType.isOptional()) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}
