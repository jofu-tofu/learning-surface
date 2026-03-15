import { spawn, execFile, type SpawnOptions } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PreflightResult } from '../../shared/providers.js';
import type { ChatLogger } from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Build the full prompt for CLI providers by appending the user request to the system prompt. */
export function buildCliPrompt(systemPrompt: string, prompt: string): string {
  return `${systemPrompt}\n\n---\nUser request: ${prompt}`;
}

function runCliProcess(
  command: string,
  args: string[],
  label: string,
  spawnOptions?: SpawnOptions,
  options?: { log?: boolean; logger?: ChatLogger },
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], ...spawnOptions });
    let stdout = '';
    let stderrOutput = '';

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      if (options?.log) {
        const outputText = chunk.toString().trim();
        if (outputText) {
          options.logger?.info(`[${label}] ${outputText}`);
        }
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) {
        stderrOutput += text + '\n';
        if (options?.log) {
          options.logger?.warn(`[${label} stderr] ${text}`);
        }
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn ${command}: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        const snippet = stderrOutput.trim().slice(0, 500);
        reject(new Error(`[${label}] exited with code ${code}${snippet ? `: ${snippet}` : ''}`));
      }
    });
  });
}

/** Spawn a CLI subprocess and return a promise that resolves on exit code 0. */
export async function spawnCli(
  command: string,
  args: string[],
  label: string,
  spawnOptions?: SpawnOptions,
  logger?: ChatLogger,
): Promise<void> {
  await runCliProcess(command, args, label, spawnOptions, { log: true, logger });
}

/** Spawn a CLI subprocess, capture stdout and return it as a string. Rejects on non-zero exit. */
export async function spawnCliCapture(
  command: string,
  args: string[],
  label: string,
  spawnOptions?: SpawnOptions,
): Promise<string> {
  return runCliProcess(command, args, label, spawnOptions);
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

/** Resolve the path to the MCP entry point script. */
function mcpEntryPath(): string {
  // __dirname is src/server/providers (dev) or dist/server/providers (prod)
  const jsPath = resolve(__dirname, '../mcp-entry.js');
  if (existsSync(jsPath)) return jsPath;
  return resolve(__dirname, '../mcp-entry.ts');
}

/** Build the full MCP server command + args for spawning. */
function mcpServerArgs(sessionDir: string): { command: string; args: string[] } {
  const entryPath = mcpEntryPath();
  if (entryPath.endsWith('.js') || process.execArgv.some(a => a.includes('tsx'))) {
    // Production (.js) or runtime has tsx loader — inherit directly
    return {
      command: process.execPath,
      args: [...process.execArgv, entryPath, sessionDir],
    };
  }
  // Dev fallback (.ts without tsx in execArgv, e.g. vitest):
  // Use the local tsx binary which handles TypeScript compilation
  const localTsx = resolve(__dirname, '../../../node_modules/.bin/tsx');
  if (existsSync(localTsx)) {
    return { command: localTsx, args: [entryPath, sessionDir] };
  }
  // Last resort: npx tsx
  return { command: 'npx', args: ['tsx', entryPath, sessionDir] };
}

/**
 * Write a temporary MCP config JSON file for Claude Code (--mcp-config flag).
 * Returns the path. Caller should clean up with `cleanupMcpConfig()`.
 */
export async function writeMcpConfig(sessionDir: string): Promise<string> {
  const configPath = join(tmpdir(), `ls-mcp-${Date.now()}.json`);
  const { command, args } = mcpServerArgs(sessionDir);
  const config = {
    mcpServers: {
      'learning-surface': { command, args },
    },
  };
  await writeFile(configPath, JSON.stringify(config), 'utf-8');
  return configPath;
}

/**
 * Build `-c` flags for Codex CLI to register an MCP server inline via TOML config overrides.
 * Returns an array of CLI args like ['-c', 'mcp_servers...command = "..."', '-c', 'mcp_servers...args = [...]'].
 */
export function codexMcpConfigArgs(sessionDir: string): string[] {
  const { command, args } = mcpServerArgs(sessionDir);
  const argsToml = `[${args.map(a => `"${a}"`).join(', ')}]`;
  return [
    '-c', `mcp_servers.learning-surface.command = "${command}"`,
    '-c', `mcp_servers.learning-surface.args = ${argsToml}`,
  ];
}

/** Clean up a temporary MCP config file. */
export async function cleanupMcpConfig(configPath: string): Promise<void> {
  await unlink(configPath).catch(() => {});
}
