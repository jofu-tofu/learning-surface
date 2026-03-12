import { mkdir, readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { createPatch, applyPatch } from 'diff';
import type { VersionStore, VersionMeta } from '../shared/types.js';

export function createVersionStore(): VersionStore {
  let dir: string;
  let currentVersion = 0;

  async function reconstructVersion(version: number): Promise<string> {
    const base = await readFile(join(dir, 'v1.md'), 'utf-8');
    let content = base;
    for (let i = 2; i <= version; i++) {
      const patch = await readFile(join(dir, `v${i}.patch`), 'utf-8');
      const result = applyPatch(content, patch);
      if (result === false) {
        throw new Error(`Failed to apply patch v${i}`);
      }
      content = result;
    }
    return content;
  }

  return {
    async init(sessionDir: string): Promise<void> {
      dir = sessionDir;
      await mkdir(dir, { recursive: true });
    },

    async createVersion(content: string, meta: Omit<VersionMeta, 'version'>): Promise<number> {
      currentVersion++;
      const version = currentVersion;

      const fullMeta: VersionMeta = { version, ...meta };

      if (version === 1) {
        await writeFile(join(dir, 'v1.md'), content, 'utf-8');
      } else {
        const previous = await reconstructVersion(version - 1);
        const patch = createPatch(`v${version}.md`, previous, content, '', '', { context: 3 });
        await writeFile(join(dir, `v${version}.patch`), patch, 'utf-8');
      }

      await writeFile(join(dir, `v${version}.meta.json`), JSON.stringify(fullMeta), 'utf-8');

      return version;
    },

    async getVersion(version: number): Promise<string> {
      if (version === 1) {
        return readFile(join(dir, 'v1.md'), 'utf-8');
      }
      return reconstructVersion(version);
    },

    async getCurrentVersion(): Promise<number> {
      return currentVersion;
    },

    async listVersions(): Promise<VersionMeta[]> {
      const files = await readdir(dir);
      const metaFiles = files.filter((f) => f.endsWith('.meta.json')).sort();
      const metas: VersionMeta[] = [];
      for (const file of metaFiles) {
        const raw = await readFile(join(dir, file), 'utf-8');
        metas.push(JSON.parse(raw) as VersionMeta);
      }
      metas.sort((a, b) => a.version - b.version);
      return metas;
    },

    async getDiff(fromVersion: number, toVersion: number): Promise<string> {
      const fromContent = await reconstructVersion(fromVersion);
      const toContent = await reconstructVersion(toVersion);
      return createPatch('document.md', fromContent, toContent, '', '', { context: 3 });
    },
  };
}
