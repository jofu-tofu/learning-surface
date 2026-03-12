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

  it('renders crumbs for each version in the path', () => {
    render(<Breadcrumb path={path} versions={versions} currentVersion={2} />);
    expect(screen.getByTestId('crumb-1')).toBeDefined();
    expect(screen.getByTestId('crumb-2')).toBeDefined();
    expect(screen.getByTestId('crumb-3')).toBeDefined();
  });

  it('shows empty state when no path', () => {
    render(<Breadcrumb path={[]} versions={[]} currentVersion={0} />);
    expect(screen.getByText(/No history yet/)).toBeDefined();
  });

  it('calls onVersionSelect when crumb is clicked', () => {
    const handler = vi.fn();
    render(<Breadcrumb path={path} versions={versions} currentVersion={2} onVersionSelect={handler} />);
    fireEvent.click(screen.getByTestId('crumb-1'));
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('shows prompt text on crumbs', () => {
    render(<Breadcrumb path={path} versions={versions} currentVersion={2} />);
    expect(screen.getByText('Explain TCP')).toBeDefined();
    expect(screen.getByText('Show handshake')).toBeDefined();
  });

  it('shows branch badge when node has multiple children', () => {
    const branched = [
      buildVersionMeta({ version: 1, prompt: 'Start', parent: undefined }),
      buildVersionMeta({ version: 2, prompt: 'Path A', parent: 1 }),
      buildVersionMeta({ version: 3, prompt: 'Path B', parent: 1 }),
    ];
    const branchPath = [branched[0], branched[1]];
    render(<Breadcrumb path={branchPath} versions={branched} currentVersion={2} />);
    expect(screen.getByText('2')).toBeDefined();
  });

  it('renders forward path crumbs as faded', () => {
    const forward = [versions[2]];
    render(
      <Breadcrumb path={[versions[0], versions[1]]} versions={versions} currentVersion={2} forwardPath={forward} />
    );
    const forwardCrumb = screen.getByTestId('crumb-3');
    expect(forwardCrumb.style.opacity).toBe('0.35');
  });

  it('calls onBranchClick when branch badge is clicked', () => {
    const branchHandler = vi.fn();
    const branched = [
      buildVersionMeta({ version: 1, prompt: 'Start', parent: undefined }),
      buildVersionMeta({ version: 2, prompt: 'Path A', parent: 1 }),
      buildVersionMeta({ version: 3, prompt: 'Path B', parent: 1 }),
    ];
    const branchPath = [branched[0], branched[1]];
    render(
      <Breadcrumb path={branchPath} versions={branched} currentVersion={2} onBranchClick={branchHandler} />
    );
    fireEvent.click(screen.getByText('2'));
    expect(branchHandler).toHaveBeenCalledWith(1);
  });
});
