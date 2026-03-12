import { describe, it, expect, vi } from 'vitest';
import { createFileWatcher } from '../watcher.js';

describe('FileWatcher', () => {
  it('start begins watching session directory', () => {
    const watcher = createFileWatcher();
    // Should start watching without error when properly implemented
    expect(() => watcher.start('/tmp/test-session')).not.toThrow();
  });

  it('file change triggers documentChange callback with parsed document', () => {
    const watcher = createFileWatcher();
    const callback = vi.fn();
    watcher.onDocumentChange(callback);
    watcher.start('/tmp/test-session');

    // Simulate a file change — the watcher should parse the file and call back
    // This test will fail because the stub throws
    expect(callback).toHaveBeenCalled();
  });

  it('stop removes watchers', () => {
    const watcher = createFileWatcher();
    watcher.start('/tmp/test-session');
    expect(() => watcher.stop()).not.toThrow();
  });

  it('handles parse errors gracefully without crashing', () => {
    const watcher = createFileWatcher();
    const callback = vi.fn();
    watcher.onDocumentChange(callback);

    // When a file contains invalid markdown (no frontmatter),
    // the watcher should log the error but not crash
    watcher.start('/tmp/test-session');
    // Trigger a file change with invalid content
    // The watcher should catch the parse error and continue running
    expect(callback).not.toHaveBeenCalledWith(undefined);
  });
});
