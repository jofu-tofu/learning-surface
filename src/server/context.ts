import * as path from 'node:path';
import type { ContextCompiler, LearningDocument, SurfaceContext } from '../shared/types.js';
import { readAllVersionMetas } from './utils/readMetas.js';

export function createContextCompiler(): ContextCompiler {
  return {
    async compile(doc: LearningDocument, sessionDir: string): Promise<SurfaceContext> {
      const activeSection = doc.sections.find(section => section.id === doc.activeSection);

      const META_KEYS = new Set(['id', 'title', '_unknownBlocks']);
      const surface: Record<string, unknown> = {};
      if (activeSection) {
        for (const [key, value] of Object.entries(activeSection)) {
          if (META_KEYS.has(key)) continue;
          surface[key] = value ?? null;
        }
      }

      const sections = doc.sections.map(section => ({
        title: section.title,
      }));

      const metas = await readAllVersionMetas(sessionDir).catch(() => []);
      const promptHistory = metas
        .filter(meta => meta.prompt)
        .map(meta => meta.prompt!);

      const topic = path.basename(sessionDir);

      return {
        session: {
          topic,
          version: doc.version,
          activeSection: doc.activeSection,
        },
        surface,
        sections,
        promptHistory,
      };
    },
  };
}
