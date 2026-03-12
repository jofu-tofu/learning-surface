import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket.js';
import type { WsMessage } from '../../../shared/types.js';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  readyState = 0; // CONNECTING
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
    this.readyState = 3; // CLOSED
  }

  send(_data: string) {
    // no-op for tests
  }

  // Test helpers
  simulateOpen() {
    this.readyState = 1; // OPEN
    this.onopen?.();
  }

  simulateMessage(data: WsMessage) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateClose() {
    this.readyState = 3;
    this.onclose?.();
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('connects to ws://localhost:PORT on mount', () => {
    const onMessage = vi.fn();
    renderHook(() =>
      useWebSocket({ url: 'ws://localhost:3000', onMessage }),
    );
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:3000');
  });

  it('calls onMessage with parsed WsMessage on server message', () => {
    const onMessage = vi.fn();
    renderHook(() =>
      useWebSocket({ url: 'ws://localhost:3000', onMessage }),
    );

    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    const message: WsMessage = {
      type: 'document-update',
      document: {
        version: 1,
        activeSection: 'intro',
        sections: [],
      },
    };
    ws.simulateMessage(message);

    expect(onMessage).toHaveBeenCalledWith(message);
  });

  it('reconnects on disconnect', async () => {
    const onMessage = vi.fn();
    renderHook(() =>
      useWebSocket({ url: 'ws://localhost:3000', onMessage }),
    );

    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();
    ws.simulateClose();

    // After disconnect, hook should attempt reconnection
    // This will create a new WebSocket instance
    await vi.waitFor(() => {
      expect(MockWebSocket.instances.length).toBeGreaterThan(1);
    });
  });

  it('disconnects on unmount', () => {
    const onMessage = vi.fn();
    const { unmount } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:3000', onMessage }),
    );

    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();
    unmount();

    expect(ws.closed).toBe(true);
  });
});
