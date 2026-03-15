import { describe, it, expect } from 'vitest';
import { getVersionPath, getChildren, getForwardPath } from '../version-tree.js';
import type { VersionMeta } from '../types.js';

function meta(version: number, parent?: number, prompt?: string): VersionMeta {
  return { version, parent, prompt: prompt ?? `v${version}`, timestamp: '2026-01-01T00:00:00Z', source: 'ai' };
}

describe('version-tree', () => {
  const linear = [meta(1), meta(2, 1), meta(3, 2)];

  const branched = [
    meta(1),
    meta(2, 1, 'Handshake'),
    meta(3, 2, 'SYN deep'),
    meta(4, 2, 'TCP vs UDP'),
    meta(5, 4, 'Gaming'),
  ];

  describe('getVersionPath', () => {
    it('returns single-element path for root', () => {
      expect(getVersionPath(1, linear).map(v => v.version)).toEqual([1]);
    });

    it('returns empty for unknown version', () => {
      expect(getVersionPath(99, linear)).toEqual([]);
    });

    it('returns full path for deep linear chain', () => {
      expect(getVersionPath(3, linear).map(v => v.version)).toEqual([1, 2, 3]);
    });

    it('follows branch path (v5 → v4 → v2 → v1)', () => {
      expect(getVersionPath(5, branched).map(v => v.version)).toEqual([1, 2, 4, 5]);
    });

    it('follows alternate branch (v3 → v2 → v1)', () => {
      expect(getVersionPath(3, branched).map(v => v.version)).toEqual([1, 2, 3]);
    });
  });

  describe('getChildren', () => {
    it('returns empty for leaf', () => {
      expect(getChildren(5, branched)).toEqual([]);
    });

    it('returns both children at branch point', () => {
      const children = getChildren(2, branched);
      expect(children.map(v => v.version).sort()).toEqual([3, 4]);
    });

    it('returns single child for linear node', () => {
      expect(getChildren(1, linear).map(v => v.version)).toEqual([2]);
    });
  });

  describe('getForwardPath', () => {
    it('stops at branch point', () => {
      expect(getForwardPath(1, branched).map(v => v.version)).toEqual([2]);
    });

    it('returns empty at leaf', () => {
      expect(getForwardPath(3, branched)).toEqual([]);
    });

    it('follows linear chain to end', () => {
      expect(getForwardPath(1, linear).map(v => v.version)).toEqual([2, 3]);
    });

    it('follows single-child chain from v4', () => {
      expect(getForwardPath(4, branched).map(v => v.version)).toEqual([5]);
    });
  });
});
