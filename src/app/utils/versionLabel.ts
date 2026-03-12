import type { VersionMeta } from '../../shared/types.js';

/** Derive a display label for a version. */
export function getVersionLabel(v: VersionMeta, isFirst = false): string {
  return v.summary || v.prompt || (isFirst ? 'Initial' : `Step ${v.version}`);
}
