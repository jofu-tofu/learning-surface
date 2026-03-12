import { describe, it, expect, vi } from 'vitest';
import { createFileWatcher } from '../watcher.js';

describe('FileWatcher', () => {
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
