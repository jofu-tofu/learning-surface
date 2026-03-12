import type { ReplProvider, ProviderInfo } from '../../shared/providers.js';
import { createCliProvider } from './cli.js';

const providers = new Map<string, ReplProvider>();

function register(provider: ReplProvider): void {
  providers.set(provider.config.id, provider);
}

// Register CLI provider (default — uses codex CLI, no API key needed)
register(createCliProvider());

// Register API provider if OPENAI_API_KEY is available
try {
  const { createCodexProvider } = await import('./codex.js');
  register(createCodexProvider());
} catch {
  console.warn('Codex API provider unavailable (missing OPENAI_API_KEY)');
}

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
