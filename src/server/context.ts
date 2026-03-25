import * as path from 'node:path';
import type { LearningDocument } from '../shared/document.js';
import type { ContextCompiler, SurfaceContext } from './types.js';
import { readAllVersionMetas } from './utils/readMetas.js';

export function createContextCompiler(): ContextCompiler {
  return {
    async compile(doc: LearningDocument, sessionDir: string): Promise<SurfaceContext> {
      const surface: Record<string, unknown> = {
        canvases: doc.canvases,
        blocks: doc.blocks,
      };
      if (doc.summary) {
        surface.summary = doc.summary;
      }

      const metas = await readAllVersionMetas(sessionDir).catch(() => []);
      const promptHistory = metas
        .filter(meta => meta.prompt)
        .map(meta => meta.prompt!);

      const topic = path.basename(sessionDir);

      return {
        session: {
          topic,
          version: doc.version,
        },
        surface,
        promptHistory,
      };
    },
  };
}
