import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from '../Breadcrumb.js';

describe('Breadcrumb', () => {
  it('shows empty state when no path', () => {
    render(<Breadcrumb path={[]} versions={[]} currentVersion={0} />);
    expect(screen.getByText(/No history yet/)).toBeDefined();
  });

});
