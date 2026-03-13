import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createVersionStore } from '../versions.js';

describe('VersionStore', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ls-versions-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('init', () => {
    it('creates directory if it does not exist', async () => {
      const nested = join(dir, 'deep', 'nested');
      const store = createVersionStore();
      await store.init(nested);
      expect(await store.getCurrentVersion()).toBe(0);
    });

    it('recovers currentVersion from existing meta files', async () => {
      // Pre-populate meta files as if versions 1-3 existed
      for (const v of [1, 2, 3]) {
        await writeFile(
          join(dir, `v${v}.meta.json`),
          JSON.stringify({ version: v, prompt: `p${v}`, timestamp: '2026-01-01T00:00:00Z', source: 'ai' }),
        );
      }
      const store = createVersionStore();
      await store.init(dir);
      expect(await store.getCurrentVersion()).toBe(3);
    });
  });

  describe('createVersion + getVersion round-trip', () => {
    it('v1 stores full content, retrievable via getVersion', async () => {
      const store = createVersionStore();
      await store.init(dir);

      const content = 'version 1 content';
      const v = await store.createVersion(content, {
        prompt: 'first',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'ai',
      });
      expect(v).toBe(1);
      expect(await store.getVersion(1)).toBe(content);

      // v1.md should exist on disk
      const raw = await readFile(join(dir, 'v1.md'), 'utf-8');
      expect(raw).toBe(content);
    });

    it('v2 stores a patch, reconstructed from v1', async () => {
      const store = createVersionStore();
      await store.init(dir);

      const v1Content = 'line 1\nline 2\nline 3\n';
      const v2Content = 'line 1\nline 2 modified\nline 3\n';

      await store.createVersion(v1Content, {
        prompt: 'first',
        timestamp: '2026-01-01T00:00:00Z',
        source: 'ai',
      });
      await store.createVersion(v2Content, {
        prompt: 'second',
        timestamp: '2026-01-01T00:01:00Z',
        source: 'ai',
      });

      expect(await store.getVersion(2)).toBe(v2Content);
      // v1 should still be accessible
      expect(await store.getVersion(1)).toBe(v1Content);
    });

    it('multi-version chain: v3 reconstructed through v1 -> v2 -> v3', async () => {
      const store = createVersionStore();
      await store.init(dir);

      const contents = [
        'line A\nline B\n',
        'line A\nline B modified\n',
        'line A changed\nline B modified\nline C added\n',
      ];

      for (let i = 0; i < contents.length; i++) {
        await store.createVersion(contents[i], {
          prompt: `prompt ${i + 1}`,
          timestamp: '2026-01-01T00:00:00Z',
          source: 'ai',
        });
      }

      for (let i = 0; i < contents.length; i++) {
        expect(await store.getVersion(i + 1)).toBe(contents[i]);
      }
    });
  });

  describe('branching (parent != version - 1)', () => {
    it('branch from v1 skips v2 patches', async () => {
      const store = createVersionStore();
      await store.init(dir);

      const v1 = 'base content\nshared\n';
      const v2 = 'base content\nshared\nv2 addition\n';
      const v3 = 'base content\nshared\nv3 branch from v1\n';

      await store.createVersion(v1, {
        prompt: 'v1', timestamp: '2026-01-01T00:00:00Z', source: 'ai',
      });
      await store.createVersion(v2, {
        prompt: 'v2', timestamp: '2026-01-01T00:01:00Z', source: 'ai',
      });
      // v3 branches from v1, not v2
      await store.createVersion(v3, {
        prompt: 'v3', timestamp: '2026-01-01T00:02:00Z', source: 'ai', parent: 1,
      });

      expect(await store.getVersion(3)).toBe(v3);
      // v2 should still be intact
      expect(await store.getVersion(2)).toBe(v2);
    });
  });

  describe('listVersions', () => {
    it('returns metas sorted by version number', async () => {
      const store = createVersionStore();
      await store.init(dir);

      await store.createVersion('a', {
        prompt: 'p1', timestamp: '2026-01-01T00:00:00Z', source: 'ai',
      });
      await store.createVersion('b', {
        prompt: 'p2', timestamp: '2026-01-01T00:01:00Z', source: 'ai',
      });

      const versions = await store.listVersions();
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(1);
      expect(versions[1].version).toBe(2);
      expect(versions[1].prompt).toBe('p2');
    });
  });

  describe('getDiff', () => {
    it('produces a unified diff between two versions', async () => {
      const store = createVersionStore();
      await store.init(dir);

      await store.createVersion('hello\nworld\n', {
        prompt: 'p1', timestamp: '2026-01-01T00:00:00Z', source: 'ai',
      });
      await store.createVersion('hello\nearth\n', {
        prompt: 'p2', timestamp: '2026-01-01T00:01:00Z', source: 'ai',
      });

      const diff = await store.getDiff(1, 2);
      expect(diff).toContain('-world');
      expect(diff).toContain('+earth');
    });
  });

  describe('getCurrentVersion', () => {
    it('tracks the latest version number', async () => {
      const store = createVersionStore();
      await store.init(dir);

      expect(await store.getCurrentVersion()).toBe(0);
      await store.createVersion('a', {
        prompt: 'p', timestamp: '2026-01-01T00:00:00Z', source: 'ai',
      });
      expect(await store.getCurrentVersion()).toBe(1);
      await store.createVersion('b', {
        prompt: 'p', timestamp: '2026-01-01T00:00:00Z', source: 'ai',
      });
      expect(await store.getCurrentVersion()).toBe(2);
    });
  });

  describe('meta files', () => {
    it('persists parent field in meta JSON for branches', async () => {
      const store = createVersionStore();
      await store.init(dir);

      await store.createVersion('v1 content', {
        prompt: 'p1', timestamp: '2026-01-01T00:00:00Z', source: 'ai',
      });
      await store.createVersion('v2 content', {
        prompt: 'p2', timestamp: '2026-01-01T00:01:00Z', source: 'ai',
      });
      // Branch from v1
      await store.createVersion('v3 branch', {
        prompt: 'p3', timestamp: '2026-01-01T00:02:00Z', source: 'ai', parent: 1,
      });

      const meta = JSON.parse(await readFile(join(dir, 'v3.meta.json'), 'utf-8'));
      expect(meta.parent).toBe(1);
      expect(meta.version).toBe(3);
    });
  });
});
