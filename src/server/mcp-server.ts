import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// --- Zod schemas for each tool's parameters ---

const ShowVisualSchema = z.object({
  type: z.enum(['mermaid', 'katex', 'code']),
  content: z.string(),
  title: z.string().optional(),
  language: z.string().optional(),
});

const EditVisualSchema = z.object({
  find: z.string(),
  replace: z.string(),
});

const BuildVisualSchema = z.object({
  additions: z.string(),
});

const AnnotateSchema = z.object({
  element: z.string(),
  label: z.string(),
});

const ExplainSchema = z.object({
  content: z.string(),
});

const EditExplanationSchema = z.object({
  find: z.string(),
  replace: z.string(),
});

const ExtendSchema = z.object({
  content: z.string(),
  position: z.enum(['before', 'after']).optional(),
});

const ChallengeSchema = z.object({
  question: z.string(),
  hints: z.array(z.string()).optional(),
});

const RevealSchema = z.object({
  checkId: z.string(),
  answer: z.string(),
  explanation: z.string(),
});

const SuggestFollowupsSchema = z.object({
  questions: z.array(z.string()),
});

const NewSectionSchema = z.object({
  title: z.string(),
});

const CompleteSectionSchema = z.object({
  section: z.string(),
});

const SetActiveSchema = z.object({
  section: z.string(),
});

// --- Tool definitions ---

interface ToolDef {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
}

const TOOL_DEFS: ToolDef[] = [
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

// Build a lookup map for tool schemas (exported for testing)
export const toolSchemaMap = new Map<string, z.ZodObject<z.ZodRawShape>>();
for (const def of TOOL_DEFS) {
  toolSchemaMap.set(def.name, def.schema);
}

// --- Factory ---

export function createMcpServer(options: {
  sessionDir: string;
}): { start(): Promise<void>; stop(): Promise<void> } {
  const { sessionDir } = options;

  const server = new Server(
    { name: 'learning-surface', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  // Register list-tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFS.map((def) => ({
      name: def.name,
      description: def.description,
      inputSchema: zodToJsonSchema(def.schema),
    })),
  }));

  // Register call-tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const schemaDef = toolSchemaMap.get(name);
    if (!schemaDef) {
      return {
        content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    // Validate params
    const parsed = schemaDef.safeParse(args);
    if (!parsed.success) {
      return {
        content: [
          { type: 'text' as const, text: `Invalid params: ${parsed.error.message}` },
        ],
        isError: true,
      };
    }

    // TODO: read current.md, call applyToolCall, write back, create version
    // For now, return a placeholder success
    return {
      content: [
        {
          type: 'text' as const,
          text: `Tool ${name} called with params in session ${sessionDir}`,
        },
      ],
    };
  });

  return {
    async start() {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
    async stop() {
      await server.close();
    },
  };
}

// --- Helpers ---

/** Convert a flat Zod object schema to JSON Schema for MCP tool registration. */
function zodToJsonSchema(schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
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
