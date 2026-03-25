import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  DesignSurfaceSchema,
  BlockInputSchema,
  DiagramDataSchema,
  TimelineDataSchema,
  ProofDataSchema,
  zodToJsonSchema,
} from '../../shared/schemas.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rejectsAll(schema: z.ZodTypeAny, cases: [string, unknown][]) {
  it.each(cases)('rejects %s', (_, input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });
}

// ---------------------------------------------------------------------------
// DesignSurfaceSchema
// ---------------------------------------------------------------------------

describe('DesignSurfaceSchema', () => {
  it('rejects empty object (summary is required)', () => {
    expect(DesignSurfaceSchema.safeParse({}).success).toBe(false);
  });

  it('accepts valid input with summary and blocks', () => {
    const result = DesignSurfaceSchema.safeParse({
      summary: 'Test topic',
      blocks: [{ type: 'text', content: 'Hello' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts clear field', () => {
    const result = DesignSurfaceSchema.safeParse({
      summary: 'Clear test',
      clear: ['canvases', 'blocks'],
    });
    expect(result.success).toBe(true);
  });

  rejectsAll(DesignSurfaceSchema, [
    ['blocks not an array', { summary: 'X', blocks: 'not-array' }],
    ['invalid clear value', { summary: 'X', clear: ['invalid'] }],
  ]);
});

// ---------------------------------------------------------------------------
// BlockInputSchema
// ---------------------------------------------------------------------------

describe('BlockInputSchema', () => {
  it('accepts text block', () => {
    expect(BlockInputSchema.safeParse({ type: 'text', content: 'Hello' }).success).toBe(true);
  });

  it('accepts interactive block', () => {
    expect(BlockInputSchema.safeParse({ type: 'interactive', prompt: 'Why?' }).success).toBe(true);
  });

  it('accepts feedback block with null correct', () => {
    expect(BlockInputSchema.safeParse({
      type: 'feedback',
      targetBlockId: 'b1',
      correct: null,
      content: 'Interesting answer',
    }).success).toBe(true);
  });

  it('accepts deeper-patterns block', () => {
    expect(BlockInputSchema.safeParse({
      type: 'deeper-patterns',
      patterns: [{ pattern: 'P', connection: 'C' }],
    }).success).toBe(true);
  });

  it('accepts suggestions block', () => {
    expect(BlockInputSchema.safeParse({
      type: 'suggestions',
      items: ['Next question'],
    }).success).toBe(true);
  });

  rejectsAll(BlockInputSchema, [
    ['unknown block type', { type: 'unknown', content: 'x' }],
    ['text block missing content', { type: 'text' }],
    ['interactive block missing prompt', { type: 'interactive' }],
    ['feedback block missing targetBlockId', { type: 'feedback', correct: true, content: 'x' }],
    ['feedback block missing content', { type: 'feedback', targetBlockId: 'b1', correct: true }],
  ]);
});

// ---------------------------------------------------------------------------
// Internal Validators
// ---------------------------------------------------------------------------

describe('DiagramDataSchema', () => {
  rejectsAll(DiagramDataSchema, [
    ['empty object', {}],
    ['nodes not array', { nodes: 'x', edges: [] }],
    ['node missing label', { nodes: [{ id: 'a' }], edges: [] }],
    ['invalid direction', { nodes: [], edges: [], direction: 'diagonal' }],
  ]);
});

describe('TimelineDataSchema', () => {
  rejectsAll(TimelineDataSchema, [
    ['empty object', {}],
    ['events not array', { events: 'x' }],
    ['event missing id', { events: [{ date: '2024', label: 'X' }] }],
    ['event missing date', { events: [{ id: '1', label: 'X' }] }],
    ['event missing label', { events: [{ id: '1', date: '2024' }] }],
    ['invalid direction', { events: [], direction: 'diagonal' }],
  ]);
});

describe('ProofDataSchema', () => {
  rejectsAll(ProofDataSchema, [
    ['empty object', {}],
    ['steps not array', { steps: 'x' }],
    ['step missing expression', { steps: [{ justification: 'by def' }] }],
    ['step missing justification', { steps: [{ expression: 'x=1' }] }],
    ['wrong type for isGoal', { steps: [{ expression: 'x', justification: 'y', isGoal: 'yes' }] }],
  ]);
});

// ---------------------------------------------------------------------------
// zodToJsonSchema()
// ---------------------------------------------------------------------------

describe('zodToJsonSchema', () => {
  it('omits required key when no required fields exist', () => {
    const AllOptional = z.object({ a: z.string().optional(), b: z.number().optional() });
    expect(zodToJsonSchema(AllOptional).required).toBeUndefined();
  });

  it('converts ZodDiscriminatedUnion to oneOf', () => {
    const Union = z.discriminatedUnion('type', [
      z.object({ type: z.literal('a'), value: z.string() }),
      z.object({ type: z.literal('b'), count: z.number() }),
    ]);
    const Wrapper = z.object({ items: z.array(Union) });
    const schema = zodToJsonSchema(Wrapper) as { properties: { items: { items: Record<string, unknown> } } };
    const itemsSchema = schema.properties.items.items;
    expect(itemsSchema).toHaveProperty('oneOf');
    expect((itemsSchema as { oneOf: unknown[] }).oneOf).toHaveLength(2);
  });

  it('converts ZodNullable to oneOf with null', () => {
    const Schema = z.object({ flag: z.boolean().nullable() });
    const result = zodToJsonSchema(Schema) as { properties: { flag: Record<string, unknown> } };
    expect(result.properties.flag).toEqual({
      oneOf: [{ type: 'boolean' }, { type: 'null' }],
    });
  });

  it('converts ZodLiteral to const', () => {
    const Schema = z.object({ kind: z.literal('fixed') });
    const result = zodToJsonSchema(Schema) as { properties: { kind: Record<string, unknown> } };
    expect(result.properties.kind).toEqual({ type: 'string', const: 'fixed' });
  });
});

describe('zodToJsonSchema snapshot', () => {
  it('DesignSurfaceSchema produces stable JSON Schema', () => {
    const jsonSchema = zodToJsonSchema(DesignSurfaceSchema);
    // Snapshot the structure to catch accidental drift
    expect(jsonSchema).toMatchSnapshot();
  });
});
