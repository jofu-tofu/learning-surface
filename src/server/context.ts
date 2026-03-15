import * as path from 'node:path';
import { getActiveSection, type ContextCompiler, type LearningDocument, type SurfaceContext } from '../shared/types.js';
import { META_KEYS } from '../shared/detectChangedPanes.js';
import { readAllVersionMetas } from './utils/readMetas.js';

export function createContextCompiler(): ContextCompiler {
  return {
    async compile(doc: LearningDocument, sessionDir: string): Promise<SurfaceContext> {
      const activeSection = getActiveSection(doc);

      const surface: Record<string, unknown> = {};
      if (activeSection) {
        for (const [key, value] of Object.entries(activeSection)) {
          if (META_KEYS.has(key)) continue;
          surface[key] = value ?? null;
        }
      }

      const sections = doc.sections.map(section => ({
        id: section.id,
        title: section.title,
        canvasIds: section.canvases.map(canvas => canvas.id),
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
