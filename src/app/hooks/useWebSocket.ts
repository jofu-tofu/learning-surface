import type { WsMessage } from '../../shared/types.js';

export interface UseWebSocketOptions {
  url: string;
  onMessage: (msg: WsMessage) => void;
}

export function useWebSocket(_options: UseWebSocketOptions): {
  connected: boolean;
  send: (data: unknown) => void;
} {
  throw new Error('Not implemented');
}
