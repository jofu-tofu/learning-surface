import * as fs from 'node:fs';
import * as path from 'node:path';
import { watch, type FSWatcher } from 'chokidar';
import type { FileWatcherService, LearningDocument } from '../shared/types.js';
import { parse } from './markdown.js';

const DEFAULT_DOCUMENT: LearningDocument = {
  version: 1,
  activeSection: '',
  sections: [],
};

export function createFileWatcher(): FileWatcherService {
  const documentCallbacks: Array<(doc: LearningDocument) => void> = [];
  const versionCallbacks: Array<(version: number) => void> = [];
  let chokidarWatcher: FSWatcher | null = null;

  function handleFileChange(filePath: string): void {
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf-8');
    } catch {
      // File doesn't exist or can't be read — use default document
      for (const cb of documentCallbacks) {
        cb(DEFAULT_DOCUMENT);
      }
      return;
    }

    let doc: LearningDocument;
    try {
      doc = parse(raw);
    } catch (err) {
      // Parse error — log but don't crash, don't call callbacks with undefined
      console.error('Parse error:', err);
      return;
    }

    for (const cb of documentCallbacks) {
      cb(doc);
    }
  }

  return {
    onDocumentChange(callback) {
      documentCallbacks.push(callback);
    },

    onVersionChange(callback) {
      versionCallbacks.push(callback);
    },

    start(sessionDir) {
      const targetFile = path.join(sessionDir, 'current.md');

      // Set up chokidar watcher for future changes
      chokidarWatcher = watch(targetFile, {
        ignoreInitial: true,
        persistent: false,
      });

      chokidarWatcher.on('change', () => {
        handleFileChange(targetFile);
      });

      chokidarWatcher.on('add', () => {
        handleFileChange(targetFile);
      });

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
