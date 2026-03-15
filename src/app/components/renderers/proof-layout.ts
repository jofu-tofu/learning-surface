import type { ProofData, ProofStep } from '../../../shared/schemas.js';

// --- Parsing ---

export function parseProofData(content: string): ProofData | null {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.steps)) return null;
    for (const step of parsed.steps) {
      if (typeof step.expression !== 'string' || typeof step.justification !== 'string') return null;
    }
    return parsed as ProofData;
  } catch {
    return null;
  }
}

// --- KaTeX Rendering ---

/** Render a KaTeX expression to HTML string. Returns error HTML on failure. */
export async function renderKatex(expression: string): Promise<string> {
  const katex = (await import('katex')).default;
  return katex.renderToString(expression, { throwOnError: false, displayMode: true });
}
