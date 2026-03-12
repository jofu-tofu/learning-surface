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

});
