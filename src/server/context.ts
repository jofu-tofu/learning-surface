import type { ContextCompiler } from '../shared/types.js';

export function createContextCompiler(): ContextCompiler {
  return {
    async compile(_doc, _sessionDir) {
      throw new Error('Not implemented');
    },
  };
}
