import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Breadcrumb } from '../Breadcrumb.js';
import { buildVersionMeta } from '../../../test/helpers.js';

describe('Breadcrumb', () => {
  const versions = [
    buildVersionMeta({ version: 1, prompt: 'Explain TCP', parent: undefined }),
    buildVersionMeta({ version: 2, prompt: 'Show handshake', parent: 1 }),
    buildVersionMeta({ version: 3, prompt: 'Add checks', parent: 2 }),
  ];

  const path = versions;

  it('shows empty state when no path', () => {
    render(<Breadcrumb path={[]} versions={[]} currentVersion={0} />);
    expect(screen.getByText(/No history yet/)).toBeDefined();
  });

});
