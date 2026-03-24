import { describe, it, expect } from 'vitest';
import { applyDesignSurface } from '../tool-handlers.js';
import { resolvePhase } from '../../shared/phase.js';
import {
  buildDocument,
  buildSection,
  buildPredictToolCall,
  buildExplainToolCall,
  fillPredictionClaims,
} from '../../test/helpers.js';
import type { LearningDocument } from '../../shared/types.js';
import type { DesignSurfaceInput } from '../../shared/schemas.js';

/** Empty doc with a single untitled placeholder section. */
function emptyDoc(): LearningDocument {
  return buildDocument({
    sections: [buildSection({ title: 'Untitled' })],
    activeSection: 'untitled',
  });
}

describe('study mode predict→explain flow', () => {
  // ─── Scenario 1: Predict tool call on empty doc ───
  it('creates section with scaffold, phase=predict, no explanation/checks/followups', () => {
    const doc = emptyDoc();
    const params = buildPredictToolCall();
    const { doc: result, results } = applyDesignSurface(doc, params as unknown as DesignSurfaceInput);

    const section = result.sections.find(s => s.id === 'tcp-handshake')!;
    expect(section).toBeDefined();
    expect(section.predictionScaffold).toBeDefined();
    expect(section.predictionScaffold!.claims).toHaveLength(3);
    expect(section.predictionScaffold!.claims.every(c => c.value === null)).toBe(true);

    // Stored phase
    expect(section.phase).toBe('predict');
    // Computed phase in study mode
    expect(resolvePhase(section, 'study')).toBe('predict');

    // No explain-phase fields
    expect(section.explanation).toBeUndefined();
    expect(section.checks).toBeUndefined();
    expect(section.followups).toBeUndefined();

    // Result confirms scaffold applied
    const sectionResult = results.sections.find(s => s.id === 'tcp-handshake');
    expect(sectionResult?.results.predictionScaffold).toBe(true);
  });

  // ─── Scenario 2: Filled claims flip resolvePhase to 'explain' ───
  it('resolvePhase returns explain after all claims filled, stored phase unchanged', () => {
    const doc = emptyDoc();
    const params = buildPredictToolCall();
    const { doc: afterPredict } = applyDesignSurface(doc, params as unknown as DesignSurfaceInput);
    const sectionId = afterPredict.sections.find(s => s.predictionScaffold)!.id;

    const filled = fillPredictionClaims(afterPredict, sectionId, {
      c1: 'Client',
      c2: 'ACK',
      c3: 'To confirm the server received the SYN-ACK',
    });

    const section = filled.sections.find(s => s.id === sectionId)!;
    // Stored phase unchanged (tool handler didn't run again)
    expect(section.phase).toBe('predict');
    // Computed phase flips because all claims are filled
    expect(resolvePhase(section, 'study')).toBe('explain');
  });

  // ─── Scenario 3: Explain tool call clears scaffold and populates explanation ───
  it('clears scaffold and populates explanation/checks/followups', () => {
    const doc = emptyDoc();
    const predictParams = buildPredictToolCall();
    const { doc: afterPredict } = applyDesignSurface(doc, predictParams as unknown as DesignSurfaceInput);
    const sectionId = afterPredict.sections.find(s => s.predictionScaffold)!.id;

    const explainParams = buildExplainToolCall(sectionId);
    const { doc: result } = applyDesignSurface(afterPredict, explainParams);

    const section = result.sections.find(s => s.id === sectionId)!;
    // Scaffold cleared
    expect(section.predictionScaffold).toBeUndefined();
    // Phase cleared by clearFields
    expect(section.phase).toBeUndefined();
    // Explain-phase fields present
    expect(section.explanation).toBeDefined();
    expect(section.checks).toHaveLength(1);
    expect(section.followups).toHaveLength(1);
    // Canvas updated (full sequence with ACK)
    const seqCanvas = section.canvases.find(c => c.id === 'full-seq');
    expect(seqCanvas).toBeDefined();
    expect(seqCanvas!.content).toContain('ACK');
  });

  // ─── Scenario 4: Explain on unfilled claims still clears scaffold ───
  it('clears scaffold even when claims are unfilled', () => {
    const doc = emptyDoc();
    const predictParams = buildPredictToolCall();
    const { doc: afterPredict } = applyDesignSurface(doc, predictParams as unknown as DesignSurfaceInput);
    const sectionId = afterPredict.sections.find(s => s.predictionScaffold)!.id;

    // Do NOT fill claims — go straight to explain
    const explainParams = buildExplainToolCall(sectionId);
    const { doc: result } = applyDesignSurface(afterPredict, explainParams);

    const section = result.sections.find(s => s.id === sectionId)!;
    expect(section.predictionScaffold).toBeUndefined();
    expect(section.explanation).toBeDefined();
  });

  // ─── Scenario 5: Invalid canvas + valid scaffold = partial success ───
  it('applies scaffold even when a canvas has invalid content', () => {
    const doc = emptyDoc();
    const params = buildPredictToolCall();
    // Inject an invalid diagram canvas alongside the valid sequence canvas
    const sections = (params as { sections: Array<Record<string, unknown>> }).sections;
    const canvases = sections[0].canvases as Array<Record<string, unknown>>;
    canvases.push({
      id: 'bad-diagram',
      type: 'diagram',
      content: 'not valid json',
    });

    const { doc: result, results } = applyDesignSurface(doc, params as unknown as DesignSurfaceInput);

    // Errors reported for invalid canvas
    expect(results.errors.length).toBeGreaterThan(0);
    expect(results.errors[0]).toContain('bad-diagram');

    const section = result.sections.find(s => s.predictionScaffold)!;
    // Scaffold still applied despite canvas error
    expect(section.predictionScaffold).toBeDefined();
    expect(section.predictionScaffold!.claims).toHaveLength(3);

    const sectionResult = results.sections.find(s => s.id === section.id);
    expect(sectionResult?.results.predictionScaffold).toBe(true);
    expect(sectionResult?.results.canvases?.['bad-diagram']?.success).toBe(false);
  });

  // ─── Scenario 6: Two predict calls — scaffold replaces ───
  it('second predict call overwrites first scaffold', () => {
    const doc = emptyDoc();
    const first = buildPredictToolCall({ claims: [
      { id: 'x1', prompt: 'First?', type: 'free-text' },
    ]});
    const { doc: afterFirst } = applyDesignSurface(doc, first as unknown as DesignSurfaceInput);
    const sectionId = afterFirst.sections.find(s => s.predictionScaffold)!.id;

    const second = buildPredictToolCall({
      sectionTitle: undefined, // target existing section by id
      claims: [
        { id: 'y1', prompt: 'Second A?', type: 'choice', options: ['A', 'B'] },
        { id: 'y2', prompt: 'Second B?', type: 'fill-blank' },
      ],
    });
    // Target existing section by id instead of creating new
    const secondSections = (second as { sections: Array<Record<string, unknown>> }).sections;
    delete secondSections[0].title;
    secondSections[0].id = sectionId;

    const { doc: result } = applyDesignSurface(afterFirst, second as unknown as DesignSurfaceInput);

    const section = result.sections.find(s => s.id === sectionId)!;
    expect(section.predictionScaffold!.claims).toHaveLength(2);
    expect(section.predictionScaffold!.claims[0].id).toBe('y1');
    expect(section.predictionScaffold!.claims[1].id).toBe('y2');
  });

  // ─── Scenario 7: Multi-section — explain only affects targeted section ───
  it('explain on one section leaves other section scaffold intact', () => {
    const doc = emptyDoc();

    // Create section A
    const predictA = buildPredictToolCall({ sectionTitle: 'Section A' });
    const { doc: afterA } = applyDesignSurface(doc, predictA as unknown as DesignSurfaceInput);

    // Create section B
    const predictB = buildPredictToolCall({ sectionTitle: 'Section B', summary: 'Section B predict' });
    const { doc: afterBoth } = applyDesignSurface(afterA, predictB as unknown as DesignSurfaceInput);

    const sectionAId = afterBoth.sections.find(s => s.title === 'Section A')!.id;
    const sectionBId = afterBoth.sections.find(s => s.title === 'Section B')!.id;

    // Explain only section A
    const explainA = buildExplainToolCall(sectionAId);
    const { doc: result } = applyDesignSurface(afterBoth, explainA);

    // Section A: explained, no scaffold
    const sA = result.sections.find(s => s.id === sectionAId)!;
    expect(sA.predictionScaffold).toBeUndefined();
    expect(sA.explanation).toBeDefined();

    // Section B: scaffold intact, no explanation
    const sB = result.sections.find(s => s.id === sectionBId)!;
    expect(sB.predictionScaffold).toBeDefined();
    expect(sB.predictionScaffold!.claims).toHaveLength(3);
    expect(sB.explanation).toBeUndefined();
    expect(sB.phase).toBe('predict');
  });

  // ─── Scenario 8: Explain without clearing scaffold transitions phase ───
  it('writing explanation to predict-phase section auto-transitions phase to explain', () => {
    const doc = emptyDoc();
    const predictParams = buildPredictToolCall();
    const { doc: afterPredict } = applyDesignSurface(doc, predictParams as unknown as DesignSurfaceInput);
    const sectionId = afterPredict.sections.find(s => s.predictionScaffold)!.id;

    // Explain WITHOUT clearing scaffold (clearScaffold: false)
    const explainParams = buildExplainToolCall(sectionId, { clearScaffold: false });
    const { doc: result } = applyDesignSurface(afterPredict, explainParams);

    const section = result.sections.find(s => s.id === sectionId)!;
    // Scaffold preserved (not cleared)
    expect(section.predictionScaffold).toBeDefined();
    // Phase auto-transitioned from 'predict' to 'explain' when explanation was written
    expect(section.phase).toBe('explain');
    // Explanation content present
    expect(section.explanation).toBeDefined();
  });

  // ─── Scenario 9: Explanation on non-predict section does not force phase ───
  it('writing explanation to section without phase does not set phase', () => {
    const doc = buildDocument({
      sections: [buildSection({ title: 'Normal Section' })],
      activeSection: 'normal-section',
    });

    const { doc: result } = applyDesignSurface(doc, {
      summary: 'test',
      sections: [{ id: 'normal-section', explanation: 'Hello world' }],
    });

    const section = result.sections[0];
    expect(section.explanation).toBe('Hello world');
    // Phase should remain undefined for non-study-mode sections
    expect(section.phase).toBeUndefined();
  });
});
