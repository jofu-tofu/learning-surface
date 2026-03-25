import { describe, it, expect } from 'vitest';
import { applyDesignSurface } from '../tool-handlers.js';
import { buildDocument } from '../../test/helpers.js';
import type { LearningDocument } from '../../shared/document.js';
import type { DesignSurfaceInput } from '../../shared/schemas.js';

describe('feedback loop flow', () => {
  // ─── Scenario 1: Interactive blocks created with response: null ───
  it('creates interactive blocks with response: null', () => {
    const doc = buildDocument();
    const { doc: result } = applyDesignSurface(doc, {
      summary: 'TCP handshake',
      canvases: [{
        id: 'setup-seq',
        type: 'sequence',
        content: JSON.stringify({
          participants: [{ id: 'client', label: 'Client' }, { id: 'server', label: 'Server' }],
          messages: [{ from: 'client', to: 'server', label: 'SYN' }],
        }),
      }],
      blocks: [
        { type: 'text', content: 'Look at the sequence diagram.' },
        { type: 'interactive', prompt: 'Who sends the next packet?' },
        { type: 'interactive', prompt: 'The flag on the final packet is ___' },
        { type: 'deeper-patterns', patterns: [
          { pattern: 'Handshake protocols', connection: 'Both parties must agree before data flows.' },
        ]},
      ],
    } as DesignSurfaceInput);

    expect(result.blocks).toHaveLength(4);
    const interactives = result.blocks.filter(b => b.type === 'interactive');
    expect(interactives).toHaveLength(2);
    expect(interactives.every(b => b.type === 'interactive' && b.response === null)).toBe(true);
    expect(result.canvases).toHaveLength(1);
  });

  // ─── Scenario 2: Feedback blocks reference interactive blocks ───
  it('feedback blocks can reference previous interactive block IDs', () => {
    // First: create interactive blocks
    const doc = buildDocument();
    const { doc: afterInteractive } = applyDesignSurface(doc, {
      summary: 'TCP quiz',
      blocks: [
        { type: 'interactive', prompt: 'Who sends the next packet?' },
        { type: 'interactive', prompt: 'Flag?' },
      ],
    } as DesignSurfaceInput);

    // Simulate learner filling responses
    const filled = structuredClone(afterInteractive);
    for (const block of filled.blocks) {
      if (block.type === 'interactive') {
        block.response = 'some answer';
      }
    }

    // AI generates feedback referencing the interactive block IDs
    const { doc: result } = applyDesignSurface(filled, {
      summary: 'TCP feedback',
      blocks: [
        { type: 'feedback', targetBlockId: 'b1', correct: true, content: 'Correct — the client sends it.' },
        { type: 'feedback', targetBlockId: 'b2', correct: false, content: 'The flag is ACK, not SYN.' },
        { type: 'text', content: 'Full explanation here.' },
        { type: 'deeper-patterns', patterns: [
          { pattern: 'Handshake protocols', connection: 'Both sides agree.' },
        ]},
        { type: 'suggestions', items: ['How does TCP handle connection teardown?'] },
      ],
    } as DesignSurfaceInput);

    expect(result.blocks).toHaveLength(5);
    const feedbacks = result.blocks.filter(b => b.type === 'feedback');
    expect(feedbacks).toHaveLength(2);
    expect(feedbacks[0]).toMatchObject({ targetBlockId: 'b1', correct: true });
    expect(feedbacks[1]).toMatchObject({ targetBlockId: 'b2', correct: false });
  });

  // ─── Scenario 3: Blocks replace entirely — old blocks gone ───
  it('replacing blocks removes all old blocks', () => {
    const doc = buildDocument({
      blocks: [
        { id: 'b1', type: 'text', content: 'Old text' },
        { id: 'b2', type: 'interactive', prompt: 'Old question', response: 'Old answer' },
      ],
    });

    const { doc: result } = applyDesignSurface(doc, {
      summary: 'New content',
      blocks: [{ type: 'text', content: 'Completely new' }],
    } as DesignSurfaceInput);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toMatchObject({ id: 'b1', type: 'text', content: 'Completely new' });
  });

  // ─── Scenario 4: Invalid canvas + valid blocks = partial success ───
  it('applies blocks even when a canvas has invalid content', () => {
    const doc = buildDocument();
    const { doc: result, results } = applyDesignSurface(doc, {
      summary: 'Partial test',
      canvases: [
        { id: 'bad-diagram', type: 'diagram', content: 'not valid json' },
      ],
      blocks: [
        { type: 'interactive', prompt: 'What happens?' },
      ],
    } as DesignSurfaceInput);

    expect(results.errors.length).toBeGreaterThan(0);
    expect(results.errors[0]).toContain('bad-diagram');
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toMatchObject({ type: 'interactive', response: null });
  });
});
