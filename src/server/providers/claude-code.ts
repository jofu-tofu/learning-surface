import type { ReplProvider, ProviderConfig, PreflightResult } from '../../shared/providers.js';
import { buildCliPrompt, spawnCli, checkCliAvailable } from './spawn-cli.js';

export function createClaudeCodeProvider(): ReplProvider {
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

    async complete({ prompt, systemPrompt, model, sessionDir, reasoningEffort }) {
      const args = [
        '--print', '--dangerously-skip-permissions',
        '--model', model,
        '--tools', 'Read,Edit,Write',
        '--no-session-persistence',
      ];
      if (reasoningEffort) args.push('--effort', reasoningEffort);
      args.push(buildCliPrompt(systemPrompt, prompt));

      return spawnCli('claude', args, 'claude-code', { cwd: sessionDir });
    },
  };
}
