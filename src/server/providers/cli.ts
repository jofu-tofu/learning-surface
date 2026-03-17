import type { Agent, ProviderConfig, PreflightResult } from '../../shared/providers.js';
import { buildCliPrompt, spawnCli, checkCliAvailable, codexMcpConfigArgs } from './spawn-cli.js';
import { createChatLogger } from '../logger.js';

export function createCliProvider(): Agent {
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

    async run({ prompt, systemPrompt, model, sessionDir, reasoningEffort }) {
      const cliArguments = [
        'exec',
        '--sandbox', 'read-only',
        '--skip-git-repo-check',
        '--ephemeral',
        '-m', model,
        ...codexMcpConfigArgs(sessionDir),
      ];
      if (reasoningEffort) cliArguments.push('-c', `model_reasoning_effort="${reasoningEffort}"`);
      cliArguments.push(buildCliPrompt(systemPrompt, prompt));

      return spawnCli('codex', cliArguments, 'codex-cli', undefined, createChatLogger(sessionDir));
    },
  };
}
