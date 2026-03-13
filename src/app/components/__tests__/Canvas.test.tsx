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

  it('shows error on invalid flowchart JSON', () => {
    const content = buildCanvasContent({ type: 'flowchart', content: 'not json' });
    render(<Canvas content={content} />);
    expect(screen.getByText(/invalid flowchart/i)).toBeDefined();
  });

  it('shows error on flowchart JSON missing required fields', () => {
    const content = buildCanvasContent({ type: 'flowchart', content: '{"nodes":"wrong"}' });
    render(<Canvas content={content} />);
    expect(screen.getByText(/invalid flowchart/i)).toBeDefined();
  });

  it('shows error on flowchart node missing id', () => {
    const content = buildCanvasContent({
      type: 'flowchart',
      content: JSON.stringify({ nodes: [{ label: 'no id' }], edges: [] }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByText(/invalid flowchart/i)).toBeDefined();
  });

  it('renders flowchart with empty nodes array', () => {
    const content = buildCanvasContent({
      type: 'flowchart',
      content: JSON.stringify({ nodes: [], edges: [] }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByText(/empty flowchart/i)).toBeDefined();
  });

  it('renders valid flowchart', () => {
    const content = buildCanvasContent({
      type: 'flowchart',
      content: JSON.stringify({
        nodes: [{ id: 'a', label: 'Start' }, { id: 'b', label: 'End' }],
        edges: [{ from: 'a', to: 'b' }],
      }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByTestId('canvas-flowchart')).toBeDefined();
  });

  it('shows error on invalid sequence JSON', () => {
    const content = buildCanvasContent({ type: 'sequence', content: '{{bad' });
    render(<Canvas content={content} />);
    expect(screen.getByText(/invalid sequence/i)).toBeDefined();
  });

  it('shows error on sequence with non-string actors', () => {
    const content = buildCanvasContent({
      type: 'sequence',
      content: JSON.stringify({ actors: [123], messages: [] }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByText(/invalid sequence/i)).toBeDefined();
  });

  it('shows error on sequence message missing label', () => {
    const content = buildCanvasContent({
      type: 'sequence',
      content: JSON.stringify({ actors: ['A', 'B'], messages: [{ from: 'A', to: 'B' }] }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByText(/invalid sequence/i)).toBeDefined();
  });

  it('renders empty sequence diagram', () => {
    const content = buildCanvasContent({
      type: 'sequence',
      content: JSON.stringify({ actors: [], messages: [] }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByText(/empty sequence/i)).toBeDefined();
  });

  it('renders valid sequence diagram', () => {
    const content = buildCanvasContent({
      type: 'sequence',
      content: JSON.stringify({
        actors: ['Client', 'Server'],
        messages: [{ from: 'Client', to: 'Server', label: 'GET /' }],
      }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByTestId('canvas-sequence')).toBeDefined();
  });

  it('handles flowchart edges referencing non-existent nodes', () => {
    const content = buildCanvasContent({
      type: 'flowchart',
      content: JSON.stringify({
        nodes: [{ id: 'a', label: 'Only' }],
        edges: [{ from: 'a', to: 'missing' }],
      }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByTestId('canvas-flowchart')).toBeDefined();
  });

  it('handles sequence messages with unknown actors', () => {
    const content = buildCanvasContent({
      type: 'sequence',
      content: JSON.stringify({
        actors: ['A'],
        messages: [{ from: 'A', to: 'Ghost', label: 'hi' }],
      }),
    });
    render(<Canvas content={content} />);
    expect(screen.getByTestId('canvas-sequence')).toBeDefined();
  });

  it('renders unsupported canvas type gracefully', () => {
    const content = buildCanvasContent({ type: 'unknown' as any, content: 'data' });
    render(<Canvas content={content} />);
    expect(screen.getByText(/unsupported/i)).toBeDefined();
  });
});
