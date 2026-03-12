import { useEffect, useRef, useState, useCallback } from 'react';
import type { WsMessage } from '../../shared/types.js';

export interface UseWebSocketOptions {
  url: string;
  onMessage: (msg: WsMessage) => void;
}

export function useWebSocket(options: UseWebSocketOptions): {
  connected: boolean;
  send: (data: unknown) => void;
} {
  const { url, onMessage } = options;
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const unmountedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    unmountedRef.current = false;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event: { data: string }) => {
        const msg: WsMessage = JSON.parse(event.data);
        onMessage(msg);
      };

      ws.onclose = () => {
        setConnected(false);
        if (!unmountedRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            if (!unmountedRef.current) {
              connect();
            }
          }, 100);
        }
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [url, onMessage]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, send };
}
