import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar.js';

describe('Sidebar', () => {
  const sections = [
    { title: 'What is TCP?', status: 'completed' },
    { title: 'The Three-Way Handshake', status: 'active' },
    { title: 'Flow Control', status: 'active' },
  ];

  it('renders section titles as navigation items', () => {
    render(<Sidebar sections={sections} activeSection="the-three-way-handshake" />);
    expect(screen.getByText('What is TCP?')).toBeDefined();
    expect(screen.getByText('The Three-Way Handshake')).toBeDefined();
    expect(screen.getByText('Flow Control')).toBeDefined();
  });

  it('shows checkmark icon for completed sections', () => {
    render(<Sidebar sections={sections} activeSection="the-three-way-handshake" />);
    // The completed section should have a checkmark indicator
    const completedItem = screen.getByText('What is TCP?').closest('[data-testid]');
    expect(completedItem?.getAttribute('data-testid')).toContain('completed');
  });

  it('shows arrow icon for active section', () => {
    render(<Sidebar sections={sections} activeSection="the-three-way-handshake" />);
    const activeItem = screen.getByText('The Three-Way Handshake').closest('[data-testid]');
    expect(activeItem?.getAttribute('data-testid')).toContain('active');
  });

  it('calls onSectionClick when section is clicked', () => {
    const handler = vi.fn();
    render(
      <Sidebar
        sections={sections}
        activeSection="the-three-way-handshake"
        onSectionClick={handler}
      />,
    );
    fireEvent.click(screen.getByText('Flow Control'));
    expect(handler).toHaveBeenCalled();
  });

  it('highlights the active section', () => {
    render(<Sidebar sections={sections} activeSection="the-three-way-handshake" />);
    const activeItem = screen.getByText('The Three-Way Handshake').closest('[data-testid]');
    expect(activeItem).toBeDefined();
    expect(activeItem?.getAttribute('data-testid')).toContain('active');
  });
});
