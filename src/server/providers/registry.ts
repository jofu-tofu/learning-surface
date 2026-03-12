import type { ReplProvider, ProviderInfo } from '../../shared/providers.js';
import { createCodexProvider } from './codex.js';

const providers = new Map<string, ReplProvider>();

function register(provider: ReplProvider): void {
  providers.set(provider.config.id, provider);
}

// Register built-in providers
register(createCodexProvider());

export function getProvider(id: string): ReplProvider | undefined {
  return providers.get(id);
}

export function listProviders(): ProviderInfo[] {
  return [...providers.values()].map((p) => ({
    id: p.config.id,
    name: p.config.name,
    models: p.config.models,
  }));
}

export function getDefaultProvider(): ReplProvider | undefined {
  return providers.values().next().value;
}
