import type { VersionMeta } from './types.js';

/** Walk parent pointers from a version back to root, return path in root-first order */
export function getVersionPath(version: number, versions: VersionMeta[]): VersionMeta[] {
  const versionMap = new Map(versions.map((meta) => [meta.version, meta]));
  const path: VersionMeta[] = [];
  let cursor = version;
  const visited = new Set<number>();
  while (cursor >= 1) {
    if (visited.has(cursor)) break;
    visited.add(cursor);
    const meta = versionMap.get(cursor);
    if (!meta) break;
    path.unshift(meta);
    if (cursor === 1 || meta.parent === undefined) break;
    cursor = meta.parent;
  }
  return path;
}

/** Get direct children of a version */
export function getChildren(version: number, versions: VersionMeta[]): VersionMeta[] {
  return versions.filter((meta) => meta.parent === version);
}

/** Get the "forward" path — the continuation that was ahead before scrubbing back.
 *  Returns the deepest single-child chain starting from `version`. */
export function getForwardPath(version: number, versions: VersionMeta[]): VersionMeta[] {
  const forward: VersionMeta[] = [];
  let cursor = version;
  const visited = new Set<number>();
  while (true) {
    if (visited.has(cursor)) break;
    visited.add(cursor);
    const children = getChildren(cursor, versions);
    if (children.length !== 1) break;
    forward.push(children[0]);
    cursor = children[0].version;
  }
  return forward;
}
