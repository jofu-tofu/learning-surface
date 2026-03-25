import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createFileWatcher } from '../watcher.js';
import type { LearningDocument } from '../../shared/document.js';
describe('FileWatcher', () => {
  let dir: string;
  const watchers: ReturnType<typeof createFileWatcher>[] = [];

  afterEach(() => {
    for (const w of watchers) w.stop();
    watchers.length = 0;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function makeWatcher() {
    const w = createFileWatcher();
    watchers.push(w);
    return w;
  }

  it('initial read calls callback with parsed document', () => {
    dir = mkdtempSync(join(tmpdir(), 'ls-watcher-'));
    writeFileSync(join(dir, 'current.surface'), JSON.stringify({
      version: 1,
      canvases: [],
      blocks: [{ id: 'b1', type: 'text', content: 'Hello' }],
    }));

    const callback = vi.fn<(doc: LearningDocument) => void>();
    const watcher = makeWatcher();
    watcher.onDocumentChange(callback);
    watcher.start(dir);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0].blocks).toHaveLength(1);
  });

  it('calls callback with default document when file does not exist', () => {
    dir = mkdtempSync(join(tmpdir(), 'ls-watcher-'));
    // Don't create the file

    const callback = vi.fn<(doc: LearningDocument) => void>();
    const watcher = makeWatcher();
    watcher.onDocumentChange(callback);
    watcher.start(dir);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0].canvases).toEqual([]);
    expect(callback.mock.calls[0][0].blocks).toEqual([]);
  });

  it('does not call callback on parse error (protects state)', () => {
    dir = mkdtempSync(join(tmpdir(), 'ls-watcher-'));
    writeFileSync(join(dir, 'current.surface'), '{ invalid json !!!');

    const callback = vi.fn<(doc: LearningDocument) => void>();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const watcher = makeWatcher();
    watcher.onDocumentChange(callback);
    watcher.start(dir);

    expect(callback).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
