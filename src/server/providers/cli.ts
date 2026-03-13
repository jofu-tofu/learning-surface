import type { ReplProvider, ProviderConfig, PreflightResult } from '../../shared/providers.js';
import { buildCliPrompt, spawnCli, checkCliAvailable } from './spawn-cli.js';

export function createCliProvider(): ReplProvider {
  const config: ProviderConfig = {
    id: 'codex',
    name: 'Codex',
    type: 'cli',
    models: [
      {
        id: 'gpt-5.3-codex-spark', name: 'Spark', displayName: '5.3 Spark',
        reasoningEfforts: ['low', 'medium', 'high'],
        defaultEffort: 'medium',
      },
      {
        id: 'gpt-5.4', name: '5.4', displayName: '5.4',
        reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
        defaultEffort: 'high',
      },
    ],
  };

  return {
    config,

    async preflight(): Promise<PreflightResult> {
      return checkCliAvailable('codex');
    },

    async complete({ prompt, systemPrompt, model, sessionDir, reasoningEffort }) {
      const args = [
        'exec', '--full-auto', '--skip-git-repo-check', '--ephemeral',
        '-m', model, '-C', sessionDir,
      ];
      if (reasoningEffort) args.push('-c', `model_reasoning_effort="${reasoningEffort}"`);
      args.push(buildCliPrompt(systemPrompt, prompt));

      return spawnCli('codex', args, 'codex-cli');
    },
  };
}
