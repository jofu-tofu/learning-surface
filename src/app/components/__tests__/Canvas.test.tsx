import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Canvas } from '../Canvas.js';
import { buildCanvasContent } from '../../../test/helpers.js';

describe('Canvas', () => {
  it('renders mermaid content into a container with data-testid="canvas-mermaid"', () => {
    const content = buildCanvasContent({ type: 'mermaid', content: 'graph LR\n  A-->B' });
    render(<Canvas content={content} />);
    expect(screen.getByTestId('canvas-mermaid')).toBeDefined();
  });

  it('renders katex content', () => {
    const content = buildCanvasContent({ type: 'katex', content: 'E = mc^2' });
    render(<Canvas content={content} />);
    expect(screen.getByTestId('canvas-katex')).toBeDefined();
  });

  it('renders code with syntax highlighting', () => {
    const content = buildCanvasContent({
      type: 'code',
      content: 'const x = 1;',
      language: 'typescript',
    });
    render(<Canvas content={content} />);
    expect(screen.getByTestId('canvas-code')).toBeDefined();
  });

  it('shows loading state while mermaid initializes', () => {
    const content = buildCanvasContent({ type: 'mermaid', content: 'graph LR\n  A-->B' });
    render(<Canvas content={content} />);
    // Should show a loading indicator while mermaid renders
    expect(screen.getByText(/loading/i)).toBeDefined();
  });

  it('shows error state on invalid mermaid syntax', () => {
    const content = buildCanvasContent({
      type: 'mermaid',
      content: 'not valid mermaid {{{{',
    });
    render(<Canvas content={content} />);
    expect(screen.getByText(/error/i)).toBeDefined();
  });

  it('updates when content prop changes', () => {
    const content1 = buildCanvasContent({ type: 'mermaid', content: 'graph LR\n  A-->B' });
    const content2 = buildCanvasContent({ type: 'mermaid', content: 'graph TD\n  X-->Y' });

    const { rerender } = render(<Canvas content={content1} />);
    rerender(<Canvas content={content2} />);
    // Content should reflect the updated prop
    expect(screen.getByTestId('canvas-mermaid')).toBeDefined();
  });
});
