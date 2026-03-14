import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  ShowVisualSchema, BuildVisualSchema, ExplainSchema, ExtendSchema,
  ChallengeSchema, SuggestFollowupsSchema,
  NewSectionSchema, SetActiveSchema, ClearSchema,
  ShowTimelineSchema, DeriveSchema,
  zodToJsonSchema,
} from '../../shared/schemas.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Table-driven rejection tests */
function rejectsAll(schema: z.ZodTypeAny, cases: [string, unknown][]) {
  it.each(cases)('rejects %s', (_, input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });
}

// ---------------------------------------------------------------------------
// MCP Tool Parameter Schemas
// ---------------------------------------------------------------------------

describe('ShowVisualSchema', () => {
  rejectsAll(ShowVisualSchema, [
    ['empty object', {}],
    ['missing content', { type: 'mermaid' }],
    ['missing type', { content: 'x' }],
    ['invalid type enum', { type: 'html', content: 'x' }],
    ['wrong type for content', { type: 'mermaid', content: 42 }],
    ['wrong type for language', { type: 'code', content: 'x', language: 123 }],
  ]);
});

describe('simple tool param schemas', () => {
  it.each([
    ['BuildVisualSchema', BuildVisualSchema, { additions: 42 }],
    ['ExplainSchema', ExplainSchema, { content: 42 }],
    ['ExtendSchema', ExtendSchema, { content: true }],
    ['NewSectionSchema', NewSectionSchema, { title: 42 }],
    ['SetActiveSchema', SetActiveSchema, { section: false }],
  ] as [string, z.ZodTypeAny, unknown][])('%s: rejects empty / rejects wrong type', (_, schema, wrongType) => {
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse(wrongType).success).toBe(false);
  });
});

describe('ChallengeSchema', () => {
  rejectsAll(ChallengeSchema, [
    ['empty object', {}],
    ['wrong type for hints', { question: 'Q?', hints: 'not-array' }],
    ['wrong type for answer', { question: 'Q?', answer: 42 }],
    ['wrong type for answerExplanation', { question: 'Q?', answerExplanation: true }],
  ]);
});

describe('SuggestFollowupsSchema', () => {
  rejectsAll(SuggestFollowupsSchema, [
    ['empty object', {}],
    ['wrong type', { questions: 'not-array' }],
    ['non-string elements', { questions: [1, 2] }],
  ]);
});

describe('ShowTimelineSchema', () => {
  rejectsAll(ShowTimelineSchema, [
    ['empty object', {}],
    ['events not an array', { events: 'not-array' }],
    ['event missing id', { events: [{ date: '2024', label: 'X' }] }],
    ['event missing date', { events: [{ id: '1', label: 'X' }] }],
    ['event missing label', { events: [{ id: '1', date: '2024' }] }],
    ['invalid direction', { events: [], direction: 'diagonal' }],
  ]);
});

describe('DeriveSchema', () => {
  rejectsAll(DeriveSchema, [
    ['empty object', {}],
    ['steps not an array', { steps: 'not-array' }],
    ['step missing expression', { steps: [{ justification: 'by def' }] }],
    ['step missing justification', { steps: [{ expression: 'x=1' }] }],
    ['wrong type for isGoal', { steps: [{ expression: 'x', justification: 'y', isGoal: 'yes' }] }],
  ]);
});

describe('ClearSchema', () => {
  rejectsAll(ClearSchema, [
    ['empty object', {}],
    ['invalid target', { target: 'everything' }],
    ['wrong type for section', { target: 'canvas', section: 42 }],
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
