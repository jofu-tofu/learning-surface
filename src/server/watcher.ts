import * as fs from 'node:fs';
import * as path from 'node:path';
import { watch, type FSWatcher } from 'chokidar';
import type { FileWatcherService, LearningDocument } from '../shared/types.js';
import { parseSurface } from './surface-file.js';
import { CURRENT_SURFACE } from './document-service.js';
import { createChatLogger, nullLogger, type ChatLogger } from './logger.js';
import { formatError } from './utils/ws-helpers.js';

const DEFAULT_DOCUMENT: LearningDocument = {
  version: 1,
  activeSection: '',
  sections: [],
};

export function createFileWatcher(): FileWatcherService {
  const documentCallbacks: Array<(doc: LearningDocument) => void> = [];
  let chokidarWatcher: FSWatcher | null = null;
  let log: ChatLogger = nullLogger;

  function handleFileChange(filePath: string): void {
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf-8');
    } catch {
      // File doesn't exist or can't be read — use default document
      for (const callback of documentCallbacks) {
        callback(DEFAULT_DOCUMENT);
      }
      return;
    }

    let doc: LearningDocument;
    try {
      doc = parseSurface(raw);
    } catch (err) {
      // Parse error — log but don't crash, don't call callbacks with undefined
      log.error('Parse error', { error: formatError(err) });
      return;
    }

    for (const callback of documentCallbacks) {
      callback(doc);
    }
  }

  return {
    onDocumentChange(callback) {
      documentCallbacks.push(callback);
    },

    start(sessionDir) {
      log = createChatLogger(sessionDir);
      const targetFile = path.join(sessionDir, CURRENT_SURFACE);

      // Set up chokidar watcher for future changes
      chokidarWatcher = watch(targetFile, {
        ignoreInitial: true,
        persistent: false,
      });

      const onChange = () => handleFileChange(targetFile);
      chokidarWatcher.on('change', onChange);
      chokidarWatcher.on('add', onChange);

      // Perform initial read
      handleFileChange(targetFile);
    },

    stop() {
      if (chokidarWatcher) {
        chokidarWatcher.close();
        chokidarWatcher = null;
      }
    },
  };
}
