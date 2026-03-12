import { spawn } from 'node:child_process';
import type { ReplProvider, ProviderConfig } from '../../shared/providers.js';
import { CLI_SYSTEM_PROMPT } from '../system-prompt.js';

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

    async complete({ prompt, systemPrompt, model, sessionDir, reasoningEffort }) {
      // Combine our CLI-specific instructions with the context from the handler
      const fullPrompt = `${CLI_SYSTEM_PROMPT}\n\n## Current Surface State\n${systemPrompt.split('## Current Surface State\n').pop() ?? ''}\n\n---\nUser request: ${prompt}`;

      const args = [
        'exec',
        '--full-auto',
        '--skip-git-repo-check',
        '--ephemeral',
        '-m', model,
        '-C', sessionDir,
      ];
      if (reasoningEffort) {
        args.push('--reasoning-effort', reasoningEffort);
      }
      args.push(fullPrompt);

      return new Promise<void>((resolve, reject) => {
        const child = spawn('codex', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        child.stdout.on('data', (data: Buffer) => {
          const text = data.toString().trim();
          if (text) console.log(`[codex-cli] ${text}`);
        });

        child.stderr.on('data', (data: Buffer) => {
          const text = data.toString().trim();
          if (text) console.error(`[codex-cli stderr] ${text}`);
        });

        child.on('error', (err) => {
          reject(new Error(`Failed to spawn codex: ${err.message}`));
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`codex exec exited with code ${code}`));
          }
        });
      });
    },
  };
}
