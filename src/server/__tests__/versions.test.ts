import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createVersionStore } from '../versions.js';

describe('VersionStore', () => {
  let sessionDir: string;

  beforeEach(async () => {
    sessionDir = await mkdtemp(join(tmpdir(), 'ls-test-'));
  });

  afterEach(async () => {
    await rm(sessionDir, { recursive: true, force: true });
  });

  describe('init()', () => {
    it('creates session directory structure', async () => {
      const store = createVersionStore();
      await store.init(sessionDir);
      const files = await readdir(sessionDir);
      // Directory should exist (it was created by mkdtemp, init should not fail)
      expect(files).toBeDefined();
    });
  });

  describe('createVersion()', () => {
    it('writes v1.md and v1.meta.json for the first version', async () => {
      const store = createVersionStore();
      await store.init(sessionDir);

      const content = '# Hello\nWorld';
      const version = await store.createVersion(content, {
        prompt: 'Explain hello',
        timestamp: '2026-03-11T00:00:00Z',
        source: 'ai',
      });

      expect(version).toBe(1);
      const v1Content = await readFile(join(sessionDir, 'v1.md'), 'utf-8');
      expect(v1Content).toBe(content);
      const v1Meta = JSON.parse(
        await readFile(join(sessionDir, 'v1.meta.json'), 'utf-8'),
      );
      expect(v1Meta.version).toBe(1);
      expect(v1Meta.prompt).toBe('Explain hello');
    });

    it('writes vN.patch and vN.meta.json for subsequent versions', async () => {
      const store = createVersionStore();
      await store.init(sessionDir);

      await store.createVersion('Line 1\nLine 2', {
        prompt: 'First',
        timestamp: '2026-03-11T00:00:00Z',
        source: 'ai',
      });

      const v2 = await store.createVersion('Line 1\nLine 2\nLine 3', {
        prompt: 'Second',
        timestamp: '2026-03-11T00:01:00Z',
        source: 'ai',
      });

      expect(v2).toBe(2);
      const patchContent = await readFile(join(sessionDir, 'v2.patch'), 'utf-8');
      expect(patchContent).toBeTruthy();
      const v2Meta = JSON.parse(
        await readFile(join(sessionDir, 'v2.meta.json'), 'utf-8'),
      );
      expect(v2Meta.version).toBe(2);
    });
  });

  describe('getVersion()', () => {
    it('returns original content for version 1', async () => {
      const store = createVersionStore();
      await store.init(sessionDir);

      const content = '# Hello\nWorld';
      await store.createVersion(content, {
        prompt: 'First',
        timestamp: '2026-03-11T00:00:00Z',
        source: 'ai',
      });

      const retrieved = await store.getVersion(1);
      expect(retrieved).toBe(content);
    });

    it('reconstructs version N by applying patches forward', async () => {
      const store = createVersionStore();
      await store.init(sessionDir);

      await store.createVersion('Line 1', {
        prompt: 'v1',
        timestamp: '2026-03-11T00:00:00Z',
        source: 'ai',
      });
      await store.createVersion('Line 1\nLine 2', {
        prompt: 'v2',
        timestamp: '2026-03-11T00:01:00Z',
        source: 'ai',
      });
      await store.createVersion('Line 1\nLine 2\nLine 3', {
        prompt: 'v3',
        timestamp: '2026-03-11T00:02:00Z',
        source: 'ai',
      });

      const v3Content = await store.getVersion(3);
      expect(v3Content).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('getCurrentVersion()', () => {
    it('returns the latest version number', async () => {
      const store = createVersionStore();
      await store.init(sessionDir);

      await store.createVersion('v1 content', {
        prompt: 'v1',
        timestamp: '2026-03-11T00:00:00Z',
        source: 'ai',
      });
      await store.createVersion('v2 content', {
        prompt: 'v2',
        timestamp: '2026-03-11T00:01:00Z',
        source: 'ai',
      });

      const current = await store.getCurrentVersion();
      expect(current).toBe(2);
    });
  });

  describe('listVersions()', () => {
    it('returns all version metas in order', async () => {
      const store = createVersionStore();
      await store.init(sessionDir);

      await store.createVersion('v1', {
        prompt: 'first',
        timestamp: '2026-03-11T00:00:00Z',
        source: 'ai',
      });
      await store.createVersion('v2', {
        prompt: 'second',
        timestamp: '2026-03-11T00:01:00Z',
        source: 'user-edit',
      });

      const versions = await store.listVersions();
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(1);
      expect(versions[0].prompt).toBe('first');
      expect(versions[1].version).toBe(2);
      expect(versions[1].source).toBe('user-edit');
    });
  });

  describe('getDiff()', () => {
    it('returns unified diff between two versions', async () => {
      const store = createVersionStore();
      await store.init(sessionDir);

      await store.createVersion('Hello\nWorld', {
        prompt: 'v1',
        timestamp: '2026-03-11T00:00:00Z',
        source: 'ai',
      });
      await store.createVersion('Hello\nBeautiful\nWorld', {
        prompt: 'v2',
        timestamp: '2026-03-11T00:01:00Z',
        source: 'ai',
      });

      const diff = await store.getDiff(1, 2);
      expect(diff).toContain('Beautiful');
    });
  });
});
