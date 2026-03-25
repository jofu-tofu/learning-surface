import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { VersionMeta } from '../../shared/session.js';
/** Read all version meta files from a session directory, sorted by version. */
export async function readAllVersionMetas(dir: string): Promise<VersionMeta[]> {
  const files = await readdir(dir);
  const metaFiles = files.filter((filename) => filename.endsWith('.meta.json'));
  const metas: VersionMeta[] = [];
  for (const file of metaFiles) {
    const fileContent = await readFile(join(dir, file), 'utf-8');
    metas.push(JSON.parse(fileContent) as VersionMeta);
  }
  metas.sort((a, b) => a.version - b.version);
  return metas;
}
