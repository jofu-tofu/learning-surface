import { z } from 'zod';

// === Zod Schemas for MCP Tool Parameters ===

export const ShowVisualSchema = z.object({
  type: z.enum(['mermaid', 'katex', 'code']),
  content: z.string(),
  title: z.string().optional(),
  language: z.string().optional(),
});

export const EditVisualSchema = z.object({
  find: z.string(),
  replace: z.string(),
});

export const BuildVisualSchema = z.object({
  additions: z.string(),
});

export const AnnotateSchema = z.object({
  element: z.string(),
  label: z.string(),
});

export const ExplainSchema = z.object({
  content: z.string(),
});

export const EditExplanationSchema = z.object({
  find: z.string(),
  replace: z.string(),
});

export const ExtendSchema = z.object({
  content: z.string(),
  position: z.enum(['before', 'after']).optional(),
});

export const ChallengeSchema = z.object({
  question: z.string(),
  hints: z.array(z.string()).optional(),
});

export const RevealSchema = z.object({
  checkId: z.string(),
  answer: z.string(),
  explanation: z.string(),
});

export const SuggestFollowupsSchema = z.object({
  questions: z.array(z.string()),
});

export const NewSectionSchema = z.object({
  title: z.string(),
});

export const CompleteSectionSchema = z.object({
  section: z.string(),
});

export const SetActiveSchema = z.object({
  section: z.string(),
});

// === Inferred TypeScript Types ===

export type ShowVisualParams = z.infer<typeof ShowVisualSchema>;
export type EditVisualParams = z.infer<typeof EditVisualSchema>;
export type BuildVisualParams = z.infer<typeof BuildVisualSchema>;
export type AnnotateParams = z.infer<typeof AnnotateSchema>;
export type ExplainParams = z.infer<typeof ExplainSchema>;
export type EditExplanationParams = z.infer<typeof EditExplanationSchema>;
export type ExtendParams = z.infer<typeof ExtendSchema>;
export type ChallengeParams = z.infer<typeof ChallengeSchema>;
export type RevealParams = z.infer<typeof RevealSchema>;
export type SuggestFollowupsParams = z.infer<typeof SuggestFollowupsSchema>;
export type NewSectionParams = z.infer<typeof NewSectionSchema>;
export type CompleteSectionParams = z.infer<typeof CompleteSectionSchema>;
export type SetActiveParams = z.infer<typeof SetActiveSchema>;

// === Tool Definitions ===

export interface ToolDef {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
}

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'show_visual',
    description: 'Display a visual (diagram, equation, or code) in the canvas pane',
    schema: ShowVisualSchema,
  },
  {
    name: 'edit_visual',
    description: 'Find-and-replace within the current canvas visual',
    schema: EditVisualSchema,
  },
  {
    name: 'build_visual',
    description: 'Append content to the current canvas visual incrementally',
    schema: BuildVisualSchema,
  },
  {
    name: 'annotate',
    description: 'Add an annotation label to a canvas element',
    schema: AnnotateSchema,
  },
  {
    name: 'explain',
    description: 'Set the explanation pane content',
    schema: ExplainSchema,
  },
  {
    name: 'edit_explanation',
    description: 'Find-and-replace within the explanation pane',
    schema: EditExplanationSchema,
  },
  {
    name: 'extend',
    description: 'Append or prepend content to the explanation pane',
    schema: ExtendSchema,
  },
  {
    name: 'challenge',
    description: 'Add a comprehension check question to the sidebar',
    schema: ChallengeSchema,
  },
  {
    name: 'reveal',
    description: 'Reveal the answer for a comprehension check',
    schema: RevealSchema,
  },
  {
    name: 'suggest_followups',
    description: 'Suggest follow-up questions in the sidebar',
    schema: SuggestFollowupsSchema,
  },
  {
    name: 'new_section',
    description: 'Create a new learning section',
    schema: NewSectionSchema,
  },
  {
    name: 'complete_section',
    description: 'Mark a section as completed',
    schema: CompleteSectionSchema,
  },
  {
    name: 'set_active',
    description: 'Set the active section',
    schema: SetActiveSchema,
  },
];

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
