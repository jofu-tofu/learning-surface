import type { FileWatcherService } from '../shared/types.js';

export function createFileWatcher(): FileWatcherService {
  return {
    onDocumentChange(_callback) {
      throw new Error('Not implemented');
    },
    onVersionChange(_callback) {
      throw new Error('Not implemented');
    },
    start(_sessionDir) {
      throw new Error('Not implemented');
    },
    stop() {
      throw new Error('Not implemented');
    },
  };
}
