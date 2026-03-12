import * as fs from 'fs/promises';
import * as path from 'path';
import type { ContextCompiler, LearningDocument, SurfaceContext, VersionMeta } from '../shared/types.js';

export function createContextCompiler(): ContextCompiler {
  return {
    async compile(doc: LearningDocument, sessionDir: string): Promise<SurfaceContext> {
      const activeSection = doc.sections.find(s => s.id === doc.activeSection);

      const surface = {
        canvas: activeSection?.canvas ?? null,
        explanation: activeSection?.explanation ?? null,
        checks: activeSection?.checks ?? [],
        followups: activeSection?.followups ?? [],
      };

      const sections = doc.sections.map(s => ({
        title: s.title,
        status: s.status,
      }));

      const promptHistory = await readPromptHistory(sessionDir);

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

async function readPromptHistory(sessionDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(sessionDir);
    const metaFiles = entries.filter(e => e.endsWith('.meta.json')).sort();
    const prompts: string[] = [];
    for (const file of metaFiles) {
      const content = await fs.readFile(path.join(sessionDir, file), 'utf-8');
      const meta: VersionMeta = JSON.parse(content);
      if (meta.prompt) {
        prompts.push(meta.prompt);
      }
    }
    return prompts;
  } catch {
    return [];
  }
}
