import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timeline } from '../Timeline.js';
import { buildVersionMeta } from '../../../test/helpers.js';

describe('Timeline', () => {
  const versions = [
    buildVersionMeta({ version: 1, prompt: 'Explain TCP' }),
    buildVersionMeta({ version: 2, prompt: 'Show handshake' }),
    buildVersionMeta({ version: 3, prompt: 'Add checks' }),
  ];

  it('renders version dots for each version', () => {
    render(<Timeline versions={versions} currentVersion={2} />);
    const dots = screen.getAllByTestId(/version-dot/);
    expect(dots).toHaveLength(3);
  });

  it('highlights the current version', () => {
    render(<Timeline versions={versions} currentVersion={2} />);
    const currentDot = screen.getByTestId('version-dot-2');
    expect(currentDot.getAttribute('data-current')).toBe('true');
  });

  it('calls onVersionSelect when dot is clicked', () => {
    const handler = vi.fn();
    render(
      <Timeline versions={versions} currentVersion={2} onVersionSelect={handler} />,
    );
    fireEvent.click(screen.getByTestId('version-dot-1'));
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('shows prompt text for current version', () => {
    render(<Timeline versions={versions} currentVersion={2} />);
    expect(screen.getByText('Show handshake')).toBeDefined();
  });
});
