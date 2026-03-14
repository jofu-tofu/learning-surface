import { describe, it, expect } from 'vitest';
import { buildSelectionContext, selectTools } from '../tool-selector.js';
import { buildDocument, buildSection, buildCanvasContent } from '../../test/helpers.js';

describe('buildSelectionContext', () => {
  it('returns empty context for null document', () => {
    const ctx = buildSelectionContext(null);
    expect(ctx.document).toBeNull();
    expect(ctx.hasCanvas).toBe(false);
    expect(ctx.canvasType).toBeNull();
    expect(ctx.hasExplanation).toBe(false);
    expect(ctx.sectionCount).toBe(0);
  });

  it('detects canvas and its type on active section', () => {
    const doc = buildDocument({
      sections: [buildSection({ canvas: buildCanvasContent({ type: 'diagram', content: '{}' }) })],
    });
    const ctx = buildSelectionContext(doc);
    expect(ctx.hasCanvas).toBe(true);
    expect(ctx.canvasType).toBe('diagram');
  });

  it('detects explanation on active section', () => {
    const doc = buildDocument({
      sections: [buildSection({ explanation: 'Some text' })],
    });
    const ctx = buildSelectionContext(doc);
    expect(ctx.hasExplanation).toBe(true);
  });
});

describe('selectTools', () => {
  const toolNames = (ctx: ReturnType<typeof buildSelectionContext>) =>
    selectTools(ctx).map(t => t.name);

  it('includes all always-available tools for null document', () => {
    const ctx = buildSelectionContext(null);
    const names = toolNames(ctx);
    expect(names).toContain('show_visual');
    expect(names).toContain('explain');
    expect(names).toContain('show_timeline');
    expect(names).toContain('derive');
  });

  it('excludes build_visual when canvas is empty', () => {
    const doc = buildDocument({ sections: [buildSection()] });
    const names = toolNames(buildSelectionContext(doc));
    expect(names).not.toContain('build_visual');
  });

  it('includes build_visual when canvas is text-based (mermaid)', () => {
    const doc = buildDocument({
      sections: [buildSection({ canvas: buildCanvasContent({ type: 'mermaid' }) })],
    });
    const names = toolNames(buildSelectionContext(doc));
    expect(names).toContain('build_visual');
  });

  it('excludes build_visual when canvas is JSON-based (diagram)', () => {
    const doc = buildDocument({
      sections: [buildSection({ canvas: buildCanvasContent({ type: 'diagram', content: '{}' }) })],
    });
    const names = toolNames(buildSelectionContext(doc));
    expect(names).not.toContain('build_visual');
  });

  it('excludes build_visual when canvas is JSON-based (timeline)', () => {
    const doc = buildDocument({
      sections: [buildSection({ canvas: buildCanvasContent({ type: 'timeline', content: '{}' }) })],
    });
    const names = toolNames(buildSelectionContext(doc));
    expect(names).not.toContain('build_visual');
  });

  it('excludes build_visual when canvas is JSON-based (proof)', () => {
    const doc = buildDocument({
      sections: [buildSection({ canvas: buildCanvasContent({ type: 'proof', content: '{}' }) })],
    });
    const names = toolNames(buildSelectionContext(doc));
    expect(names).not.toContain('build_visual');
  });

  it('excludes extend when explanation is empty', () => {
    const doc = buildDocument({ sections: [buildSection()] });
    const names = toolNames(buildSelectionContext(doc));
    expect(names).not.toContain('extend');
  });

  it('includes extend when explanation has content', () => {
    const doc = buildDocument({
      sections: [buildSection({ explanation: 'text' })],
    });
    const names = toolNames(buildSelectionContext(doc));
    expect(names).toContain('extend');
  });

  it('excludes set_active when there is only one section', () => {
    const doc = buildDocument({ sections: [buildSection()] });
    const names = toolNames(buildSelectionContext(doc));
    expect(names).not.toContain('set_active');
  });

  it('includes set_active when there are multiple sections', () => {
    const doc = buildDocument({
      sections: [
        buildSection({ title: 'Section 1' }),
        buildSection({ title: 'Section 2' }),
      ],
    });
    const names = toolNames(buildSelectionContext(doc));
    expect(names).toContain('set_active');
  });
});
