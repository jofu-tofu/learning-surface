import type { LearningDocument } from '../shared/types.js';

export function parse(_raw: string): LearningDocument {
  throw new Error('Not implemented');
}

export function serialize(_doc: LearningDocument): string {
  throw new Error('Not implemented');
}

export function applyToolCall(
  _doc: LearningDocument,
  _tool: string,
  _params: Record<string, unknown>,
): LearningDocument {
  throw new Error('Not implemented');
}
