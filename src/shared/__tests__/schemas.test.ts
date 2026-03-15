import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  DesignSurfaceSchema,
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
  it('accepts empty object (all fields optional)', () => {
    expect(DesignSurfaceSchema.safeParse({}).success).toBe(true);
  });

  it('accepts sections array with section updates', () => {
    const result = DesignSurfaceSchema.safeParse({
      sections: [{ title: 'Test', explanation: 'Hello' }],
    });
    expect(result.success).toBe(true);
  });

  rejectsAll(DesignSurfaceSchema, [
    ['sections not an array', { sections: 'not-array' }],
    ['clearAll not boolean', { clearAll: 'yes' }],
    ['removeSection not string', { removeSection: 42 }],
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
});

describe('zodToJsonSchema snapshot', () => {
  it('DesignSurfaceSchema produces stable JSON Schema', () => {
    const jsonSchema = zodToJsonSchema(DesignSurfaceSchema);
    // Snapshot the structure to catch accidental drift
    expect(jsonSchema).toMatchSnapshot();
  });
});
