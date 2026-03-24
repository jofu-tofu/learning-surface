import * as path from 'node:path';
import { getActiveSection, type LearningDocument } from '../shared/types.js';
import type { ContextCompiler, SurfaceContext } from './types.js';
import { META_KEYS } from '../shared/detectChangedPanes.js';
import { readAllVersionMetas } from './utils/readMetas.js';
import { resolvePhase } from '../shared/phase.js';

/** Keys to omit from the surface object during predict phase (AI shouldn't see answers). */
const PREDICT_OMIT_KEYS = new Set(['explanation', 'checks', 'followups']);

export function createContextCompiler(): ContextCompiler {
  return {
    async compile(doc: LearningDocument, sessionDir: string, mode: 'study' | 'answer' = 'answer'): Promise<SurfaceContext> {
      const activeSection = getActiveSection(doc);
      const phase = activeSection ? resolvePhase(activeSection, mode) : 'explain';

      const surface: Record<string, unknown> = {};
      if (activeSection) {
        for (const [key, value] of Object.entries(activeSection)) {
          if (META_KEYS.has(key)) continue;
          // In predict phase, omit explanation/checks/followups so the AI can't see them
          if (phase === 'predict' && PREDICT_OMIT_KEYS.has(key)) continue;
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
        mode,
        phase,
        surface,
        sections,
        promptHistory,
      };
    },
  };
}
