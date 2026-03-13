import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Canvas } from '../Canvas.js';
import { buildCanvasContent } from '../../../test/helpers.js';

describe('Canvas', () => {
  it('shows error state on invalid mermaid syntax', () => {
    const content = buildCanvasContent({
      type: 'mermaid',
      content: 'not valid mermaid {{{{',
    });
    render(<Canvas content={content} />);
    expect(screen.getByText(/error/i)).toBeDefined();
  });

  it('shows error on invalid diagram JSON', () => {
    const content = buildCanvasContent({ type: 'diagram', content: 'not json' });
    render(<Canvas content={content} />);
    expect(screen.getByText(/invalid diagram/i)).toBeDefined();
  });

  it('shows error on diagram JSON missing required fields', () => {
    const content = buildCanvasContent({ type: 'diagram', content: '{"nodes":"wrong"}' });
    render(<Canvas content={content} />);
    expect(screen.getByText(/invalid diagram/i)).toBeDefined();
  });

  it('shows error on diagram node missing id', () => {
    const content = buildCanvasContent({
      type: 'diagram',
      content: JSON.stringify({ nodes: [{ label: 'no id' }], edges: [] }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByText(/invalid diagram/i)).toBeDefined();
  });

  it('renders diagram with empty nodes array', () => {
    const content = buildCanvasContent({
      type: 'diagram',
      content: JSON.stringify({ nodes: [], edges: [] }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByText(/empty diagram/i)).toBeDefined();
  });

  it('renders valid diagram', () => {
    const content = buildCanvasContent({
      type: 'diagram',
      content: JSON.stringify({
        nodes: [{ id: 'a', label: 'Start' }, { id: 'b', label: 'End' }],
        edges: [{ from: 'a', to: 'b' }],
      }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByTestId('canvas-diagram')).toBeDefined();
  });

  it('handles diagram edges referencing non-existent nodes', () => {
    const content = buildCanvasContent({
      type: 'diagram',
      content: JSON.stringify({
        nodes: [{ id: 'a', label: 'Only' }],
        edges: [{ from: 'a', to: 'missing' }],
      }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByTestId('canvas-diagram')).toBeDefined();
  });

  it('renders unsupported canvas type gracefully', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = buildCanvasContent({ type: 'unknown' as any, content: 'data' });
    render(<Canvas content={content} />);
    expect(screen.getByText(/unsupported/i)).toBeDefined();
  });
});
