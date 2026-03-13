import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPatch, applyPatch } from 'diff';
import type { VersionStore, VersionMeta } from '../shared/types.js';
import { readAllVersionMetas } from './utils/readMetas.js';

export function createVersionStore(): VersionStore {
  let sessionDir: string;
  let currentVersion = 0;
  const metaIndex = new Map<number, VersionMeta>();
  let versionLock = Promise.resolve();

  function getParentChain(version: number): number[] {
    const chain: number[] = [];
    let current = version;
    const visited = new Set<number>();
    while (current >= 1) {
      if (visited.has(current)) break;
      visited.add(current);
      chain.unshift(current);
      if (current === 1) break;
      const meta = metaIndex.get(current);
      current = meta?.parent ?? current - 1;
    }
    return chain;
  }

  async function reconstructVersion(version: number): Promise<string> {
    const chain = getParentChain(version);
    const base = await readFile(join(sessionDir, 'v1.md'), 'utf-8');
    let content = base;
    for (let i = 1; i < chain.length; i++) {
      const chainVersion = chain[i];
      const patch = await readFile(join(sessionDir, `v${chainVersion}.patch`), 'utf-8');
      const result = applyPatch(content, patch);
      if (result === false) {
        throw new Error(`Failed to apply patch v${chainVersion}`);
      }
      content = result;
    }
    return content;
  }

  return {
    async init(initDir: string): Promise<void> {
      sessionDir = initDir;
      await mkdir(sessionDir, { recursive: true });
      const metas = await readAllVersionMetas(sessionDir);
      for (const meta of metas) {
        metaIndex.set(meta.version, meta);
        if (meta.version > currentVersion) currentVersion = meta.version;
      }
    },

    createVersion(content: string, meta: Omit<VersionMeta, 'version'>): Promise<number> {
      const result = versionLock.then(async () => {
        currentVersion++;
        const version = currentVersion;
        const parent = meta.parent ?? (version > 1 ? version - 1 : undefined);
        const fullMeta: VersionMeta = { version, ...meta, parent };

        if (version === 1) {
          await writeFile(join(sessionDir, 'v1.md'), content, 'utf-8');
        } else {
          const parentContent = await reconstructVersion(parent!);
          const patch = createPatch(`v${version}.md`, parentContent, content, '', '', { context: 3 });
          await writeFile(join(sessionDir, `v${version}.patch`), patch, 'utf-8');
        }

        metaIndex.set(version, fullMeta);
        await writeFile(join(sessionDir, `v${version}.meta.json`), JSON.stringify(fullMeta), 'utf-8');

        return version;
      });
      versionLock = result.then(() => {}, () => {});
      return result;
    },

    async getVersion(version: number): Promise<string> {
      if (version === 1) {
        return readFile(join(sessionDir, 'v1.md'), 'utf-8');
      }
      return reconstructVersion(version);
    },

    async getCurrentVersion(): Promise<number> {
      return currentVersion;
    },

    async listVersions(): Promise<VersionMeta[]> {
      return [...metaIndex.values()].sort((a, b) => a.version - b.version);
    },

    async getDiff(fromVersion: number, toVersion: number): Promise<string> {
      const fromContent = await reconstructVersion(fromVersion);
      const toContent = await reconstructVersion(toVersion);
      return createPatch('document.md', fromContent, toContent, '', '', { context: 3 });
    },
  };
}
