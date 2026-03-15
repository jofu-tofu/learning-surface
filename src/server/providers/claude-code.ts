import type { Agent, ProviderConfig, PreflightResult } from '../../shared/providers.js';
import { buildCliPrompt, spawnCli, spawnCliCapture, checkCliAvailable, writeMcpConfig, cleanupMcpConfig } from './spawn-cli.js';

export function createClaudeCodeProvider(): Agent {
  const config: ProviderConfig = {
    id: 'claude-code',
    name: 'Claude Code',
    type: 'cli',
    models: [
      {
        id: 'haiku', name: 'Haiku', displayName: 'Haiku',
        reasoningEfforts: ['low', 'medium', 'high'],
        defaultEffort: 'high',
      },
      {
        id: 'sonnet', name: 'Sonnet', displayName: 'Sonnet',
        reasoningEfforts: ['low', 'medium', 'high'],
        defaultEffort: 'high',
      },
      {
        id: 'opus', name: 'Opus', displayName: 'Opus',
        reasoningEfforts: ['low', 'medium', 'high', 'max'],
        defaultEffort: 'high',
      },
    ],
  };

  return {
    config,

    async preflight(): Promise<PreflightResult> {
      return checkCliAvailable('claude');
    },

    async ask({ prompt, systemPrompt, model, responseSchema, reasoningEffort }) {
      const schemaJson = JSON.stringify(responseSchema);
      const args = [
        '--print', '--model', model,
        '--json-schema', schemaJson,
        '--no-session-persistence',
      ];
      if (reasoningEffort) args.push('--effort', reasoningEffort);
      args.push(buildCliPrompt(systemPrompt, prompt));
      const stdout = await spawnCliCapture('claude', args, 'claude-ask');
      // Claude Code may wrap output in markdown fences
      const cleaned = stdout.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleaned) as Record<string, unknown>;
    },

    async run({ prompt, systemPrompt, model, sessionDir, reasoningEffort }) {
      const mcpConfigPath = await writeMcpConfig(sessionDir);
      try {
        const cliArguments = [
          '--print', '--dangerously-skip-permissions',
          '--model', model,
          '--mcp-config', mcpConfigPath,
          '--strict-mcp-config',
          '--tools', '',
          '--no-session-persistence',
        ];
        if (reasoningEffort) cliArguments.push('--effort', reasoningEffort);
        cliArguments.push(buildCliPrompt(systemPrompt, prompt));

        return await spawnCli('claude', cliArguments, 'claude-code');
      } finally {
        await cleanupMcpConfig(mcpConfigPath);
      }
    },
  };
}
