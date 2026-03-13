import { spawn, execFile, type SpawnOptions } from 'node:child_process';
import { CLI_SYSTEM_PROMPT } from '../system-prompt.js';
import type { PreflightResult } from '../../shared/providers.js';

/** Build the full prompt for CLI providers by combining the CLI system prompt with context. */
export function buildCliPrompt(systemPrompt: string, prompt: string): string {
  return `${CLI_SYSTEM_PROMPT}\n\n## Current Surface State\n${systemPrompt.split('## Current Surface State\n').pop() ?? ''}\n\n---\nUser request: ${prompt}`;
}

/** Spawn a CLI subprocess and return a promise that resolves on exit code 0. */
export function spawnCli(command: string, args: string[], label: string, opts?: SpawnOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], ...opts });

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) console.log(`[${label}] ${text}`);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString().trim();
      if (text) console.error(`[${label} stderr] ${text}`);
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn ${command}: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

/** Check if a CLI binary is available on PATH. */
export function checkCliAvailable(command: string): Promise<PreflightResult> {
  return new Promise((resolve) => {
    execFile('which', [command], { timeout: 3000 }, (err) => {
      if (err) resolve({ ok: false, error: `${command} is not installed or not on PATH` });
      else resolve({ ok: true });
    });
  });
}
