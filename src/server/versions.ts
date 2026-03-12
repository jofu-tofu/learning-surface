import type { VersionStore } from '../shared/types.js';

export function createVersionStore(): VersionStore {
  return {
    async init(_sessionDir: string): Promise<void> {
      throw new Error('Not implemented');
    },
    async createVersion(_content: string, _meta: Parameters<VersionStore['createVersion']>[1]): Promise<number> {
      throw new Error('Not implemented');
    },
    async getVersion(_version: number): Promise<string> {
      throw new Error('Not implemented');
    },
    async getCurrentVersion(): Promise<number> {
      throw new Error('Not implemented');
    },
    async listVersions(): Promise<ReturnType<VersionStore['listVersions']> extends Promise<infer T> ? T : never> {
      throw new Error('Not implemented');
    },
    async getDiff(_fromVersion: number, _toVersion: number): Promise<string> {
      throw new Error('Not implemented');
    },
  };
}
