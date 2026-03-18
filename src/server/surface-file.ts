import { SurfaceFileSchema } from '../shared/schemas.js';
import type { LearningDocument } from '../shared/types.js';

// === Public API ===

/**
 * Sanitize JSON that may contain literal control characters inside string values.
 * CLI providers sometimes write unescaped newlines/tabs in JSON strings.
 */
export function sanitizeJsonControlChars(raw: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString && char === '\n') {
      result += '\\n';
      continue;
    }
    if (inString && char === '\t') {
      result += '\\t';
      continue;
    }
    if (inString && char === '\r') {
      result += '\\r';
      continue;
    }

    result += char;
  }

  return result;
}

/** Parse and validate a .surface JSON string into a LearningDocument. */
export function parseSurface(raw: string): LearningDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Retry with control character sanitization (handles CLI-generated JSON)
    parsed = JSON.parse(sanitizeJsonControlChars(raw));
  }
  return SurfaceFileSchema.parse(parsed) as LearningDocument;
}

/** Serialize a LearningDocument to pretty-printed JSON for .surface format. */
export function serializeSurface(doc: LearningDocument): string {
  return JSON.stringify(doc, null, 2) + '\n';
}
