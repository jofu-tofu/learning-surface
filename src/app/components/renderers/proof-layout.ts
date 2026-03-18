import type { ProofData, ProofStep } from '../../../shared/schemas.js';
import { parseJsonData } from './shared/parse-utils.js';

// --- Parsing ---

export function parseProofData(content: string): ProofData | null {
  return parseJsonData<ProofData>(content, (parsed) => {
    const d = parsed as Record<string, unknown>;
    if (!Array.isArray(d.steps)) return null;
    for (const step of d.steps as Record<string, unknown>[]) {
      if (typeof step.expression !== 'string' || typeof step.justification !== 'string') return null;
    }
    return parsed as ProofData;
  });
}

// --- KaTeX Rendering ---

/** Render a KaTeX expression to HTML string. Returns error HTML on failure. */
export async function renderKatex(expression: string): Promise<string> {
  const katex = (await import('katex')).default;
  return katex.renderToString(expression, { throwOnError: false, displayMode: true });
}
