export function createMcpServer(_options: {
  sessionDir: string;
}): { start(): Promise<void>; stop(): Promise<void> } {
  throw new Error('Not implemented');
}
