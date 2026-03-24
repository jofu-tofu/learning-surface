import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  DesignSurfaceSchema,
  DiagramDataSchema,
  TimelineDataSchema,
  ProofDataSchema,
  PredictionClaimInputSchema,
  PredictionScaffoldInputSchema,
  PredictionClaimSchema,
  PredictionScaffoldSchema,
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

  it('accepts valid input with summary', () => {
    const result = DesignSurfaceSchema.safeParse({
      summary: 'Test topic',
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

// ---------------------------------------------------------------------------
// Prediction Schemas
// ---------------------------------------------------------------------------

describe('PredictionClaimInputSchema', () => {
  rejectsAll(PredictionClaimInputSchema, [
    ['missing id', { prompt: 'What happens?', type: 'choice' }],
    ['missing prompt', { id: 'c1', type: 'choice' }],
    ['missing type', { id: 'c1', prompt: 'What happens?' }],
    ['invalid type value', { id: 'c1', prompt: 'What happens?', type: 'essay' }],
  ]);
});

describe('PredictionClaimSchema', () => {
  rejectsAll(PredictionClaimSchema, [
    ['missing value field', { id: 'c1', prompt: 'What happens?', type: 'choice' }],
  ]);

  it('accepts claim with null value', () => {
    const result = PredictionClaimSchema.safeParse({
      id: 'c1',
      prompt: 'What happens?',
      type: 'choice',
      value: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('PredictionScaffoldInputSchema', () => {
  rejectsAll(PredictionScaffoldInputSchema, [
    ['missing question', { claims: [{ id: 'c1', prompt: 'X?', type: 'choice' }] }],
  ]);
});

describe('PredictionScaffoldSchema', () => {
  it('accepts scaffold with null values in claims', () => {
    const result = PredictionScaffoldSchema.safeParse({
      question: 'Predict the output',
      claims: [
        { id: 'c1', prompt: 'What happens?', type: 'choice', value: null },
        { id: 'c2', prompt: 'Why?', type: 'free-text', value: null },
      ],
    });
    expect(result.success).toBe(true);
  });

  rejectsAll(PredictionScaffoldSchema, [
    [
      'claim with non-null non-string value',
      {
        question: 'Predict the output',
        claims: [{ id: 'c1', prompt: 'X?', type: 'choice', value: 42 }],
      },
    ],
  ]);
});

describe('zodToJsonSchema snapshot', () => {
  it('DesignSurfaceSchema produces stable JSON Schema', () => {
    const jsonSchema = zodToJsonSchema(DesignSurfaceSchema);
    // Snapshot the structure to catch accidental drift
    expect(jsonSchema).toMatchSnapshot();
  });
});
