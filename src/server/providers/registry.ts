import type { Agent, ProviderInfo } from '../../shared/providers.js';
import { createCliProvider } from './cli.js';
import { createClaudeCodeProvider } from './claude-code.js';

const providers = new Map<string, Agent>();

function register(provider: Agent): void {
  providers.set(provider.config.id, provider);
}

// Register CLI provider (default — uses codex CLI, no API key needed)
register(createCliProvider());

// Register Claude Code provider (uses claude CLI auth, no API key needed)
register(createClaudeCodeProvider());

// Register API provider if OPENAI_API_KEY is available
try {
  const { createCodexProvider } = await import('./codex.js');
  register(createCodexProvider());
} catch {
  console.warn('Codex API provider unavailable (missing OPENAI_API_KEY)');
}

export function getProvider(id: string): Agent | undefined {
  return providers.get(id);
}

export function listProviders(): ProviderInfo[] {
  return [...providers.values()].map((provider) => ({
    id: provider.config.id,
    name: provider.config.name,
    models: provider.config.models,
    type: provider.config.type,
  }));
}

/** Run preflight checks for all providers and return enriched info with status. */
export async function listProvidersWithStatus(): Promise<ProviderInfo[]> {
  const results = await Promise.all(
    [...providers.values()].map(async (provider) => {
      const firstModel = provider.config.models[0]?.id ?? '';
      let status: { available: boolean; error?: string };
      try {
        const result = await provider.preflight(firstModel);
        status = { available: result.ok, error: result.error };
      } catch (err) {
        status = { available: false, error: err instanceof Error ? err.message : String(err) };
      }
      return {
        id: provider.config.id,
        name: provider.config.name,
        models: provider.config.models,
        type: provider.config.type,
        status,
      };
    }),
  );
  return results;
}
