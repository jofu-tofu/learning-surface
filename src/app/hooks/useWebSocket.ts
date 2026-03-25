import { useEffect, useRef, useState, useCallback } from 'react';
import type { WsMessage } from '../../shared/messages.js';
interface UseWebSocketOptions {
  url: string;
  onMessage: (msg: WsMessage) => void;
}

export function useWebSocket(options: UseWebSocketOptions): {
  connected: boolean;
  send: (payload: unknown) => void;
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
        try {
          const msg: WsMessage = JSON.parse(event.data);
          onMessage(msg);
        } catch {
          // Malformed message from server — drop silently
        }
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

  const send = useCallback((payload: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { connected, send };
}
