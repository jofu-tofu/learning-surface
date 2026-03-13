import type { VersionMeta } from '../../shared/types.js';

/** Derive a display label for a version. */
export function getVersionLabel(versionMeta: VersionMeta, isFirst = false): string {
  return versionMeta.summary || versionMeta.prompt || (isFirst ? 'Initial' : `Step ${versionMeta.version}`);
}
