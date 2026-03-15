import { appendFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const LOG_FILENAME = 'debug.log';

export interface ChatLogger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  toolCall(toolName: string, params: unknown): void;
  toolResult(toolName: string, result: unknown, durationMs?: number): void;
  clear(): void;
}

/** No-op logger for contexts where no chat directory is available. */
export const nullLogger: ChatLogger = {
  info() {},
  warn() {},
  error() {},
  toolCall() {},
  toolResult() {},
  clear() {},
};

/**
 * Create a file-backed logger scoped to a single chat directory.
 *
 * Writes to `<chatDir>/debug.log`. Because the chat directory is
 * `rm -rf`'d on deletion, the log is cleaned up automatically.
 * Call `clear()` to truncate without deleting.
 */
export function createChatLogger(chatDir: string): ChatLogger {
  const logPath = join(chatDir, LOG_FILENAME);
  let dirReady = false;

  function ensureDir(): void {
    if (dirReady) return;
    try {
      mkdirSync(chatDir, { recursive: true });
      dirReady = true;
    } catch {
      // Directory may not be writable (e.g. in tests) — silently skip
    }
  }

  function ts(): string {
    return new Date().toISOString();
  }

  function formatData(data: unknown): string {
    if (data === undefined) return '';
    try {
      const json = JSON.stringify(data, null, 2);
      return '\n  ' + json.replace(/\n/g, '\n  ');
    } catch {
      return '\n  [unserializable]';
    }
  }

  function append(level: string, message: string, data?: unknown): void {
    ensureDir();
    const line = `[${ts()}] ${level.padEnd(11)} ${message}${formatData(data)}\n`;
    try {
      appendFileSync(logPath, line, 'utf-8');
    } catch {
      // Logging must never crash the server
    }
  }

  return {
    info(message, data) { append('INFO', message, data); },
    warn(message, data) { append('WARN', message, data); },
    error(message, data) { append('ERROR', message, data); },

    toolCall(toolName, params) {
      append('TOOL_CALL', toolName, params);
    },

    toolResult(toolName, result, durationMs) {
      const suffix = durationMs !== undefined ? ` (${durationMs}ms)` : '';
      append('TOOL_RESULT', `${toolName}${suffix}`, result);
    },

    clear() {
      try {
        writeFileSync(logPath, '', 'utf-8');
      } catch {
        // Swallow errors
      }
    },
  };
}
