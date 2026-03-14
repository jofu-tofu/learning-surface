import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Agent, ProviderConfig, PreflightResult } from '../../shared/providers.js';
import { buildCliPrompt, spawnCli, spawnCliCapture, checkCliAvailable } from './spawn-cli.js';

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

    async ask({ prompt, systemPrompt, model, responseSchema, reasoningEffort }) {
      const tmpFile = join(tmpdir(), `ls-schema-${Date.now()}.json`);
      try {
        await writeFile(tmpFile, JSON.stringify(responseSchema), 'utf-8');
        const args = ['exec', '--output-schema', tmpFile, '-m', model];
        if (reasoningEffort) args.push('-c', `model_reasoning_effort="${reasoningEffort}"`);
        args.push(buildCliPrompt(systemPrompt, prompt));
        const stdout = await spawnCliCapture('codex', args, 'codex-ask');
        return JSON.parse(stdout) as Record<string, unknown>;
      } finally {
        await unlink(tmpFile).catch(() => {});
      }
    },

    async run({ prompt, systemPrompt, model, sessionDir, reasoningEffort }) {
      const cliArguments = [
        'exec', '--full-auto', '--skip-git-repo-check', '--ephemeral',
        '-m', model, '-C', sessionDir,
      ];
      if (reasoningEffort) cliArguments.push('-c', `model_reasoning_effort="${reasoningEffort}"`);
      cliArguments.push(buildCliPrompt(systemPrompt, prompt));

      return spawnCli('codex', cliArguments, 'codex-cli');
    },
  };
}
