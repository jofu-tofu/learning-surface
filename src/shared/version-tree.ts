import type { VersionMeta } from './types.js';

/** Walk parent pointers from a version back to root, return path in root-first order */
export function getVersionPath(version: number, versions: VersionMeta[]): VersionMeta[] {
  const byVersion = new Map(versions.map((v) => [v.version, v]));
  const path: VersionMeta[] = [];
  let current = version;
  while (current >= 1) {
    const meta = byVersion.get(current);
    if (!meta) break;
    path.unshift(meta);
    if (current === 1 || meta.parent === undefined) break;
    current = meta.parent;
  }
  return path;
}

/** Get direct children of a version */
export function getChildren(version: number, versions: VersionMeta[]): VersionMeta[] {
  return versions.filter((v) => v.parent === version);
}

/** Get the "forward" path — the continuation that was ahead before scrubbing back.
 *  Returns the deepest single-child chain starting from `version`. */
export function getForwardPath(version: number, versions: VersionMeta[]): VersionMeta[] {
  const forward: VersionMeta[] = [];
  let current = version;
  while (true) {
    const children = getChildren(current, versions);
    if (children.length !== 1) break;
    forward.push(children[0]);
    current = children[0].version;
  }
  return forward;
}
