import { spawn } from 'node:child_process';
import type { ReplProvider, ProviderConfig } from '../../shared/providers.js';
import { CLI_SYSTEM_PROMPT } from '../system-prompt.js';

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

    async complete({ prompt, systemPrompt, model, sessionDir }) {
      const fullPrompt = `${CLI_SYSTEM_PROMPT}\n\n## Current Surface State\n${systemPrompt.split('## Current Surface State\n').pop() ?? ''}\n\n---\nUser request: ${prompt}`;

      const args = [
        '--print',
        '--dangerously-skip-permissions',
        '--model', model,
        '--tools', 'Read,Edit,Write',
        '--no-session-persistence',
      ];
      // Claude Code CLI does not support reasoning effort flags
      args.push(fullPrompt);

      return new Promise<void>((resolve, reject) => {
        const child = spawn('claude', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: sessionDir,
        });

        child.stdout.on('data', (data: Buffer) => {
          const text = data.toString().trim();
          if (text) console.log(`[claude-code] ${text}`);
        });

        child.stderr.on('data', (data: Buffer) => {
          const text = data.toString().trim();
          if (text) console.error(`[claude-code stderr] ${text}`);
        });

        child.on('error', (err) => {
          reject(new Error(`Failed to spawn claude: ${err.message}`));
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`claude exited with code ${code}`));
          }
        });
      });
    },
  };
}
