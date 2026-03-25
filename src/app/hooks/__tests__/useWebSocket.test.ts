import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket.js';
import type { WsMessage } from '../../../shared/messages.js';
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

  it('does not reconnect when onMessage reference is stable', () => {
    const onMessage = vi.fn();
    const { rerender } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:3000', onMessage }),
    );

    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    // Re-render several times with the SAME onMessage reference
    rerender();
    rerender();
    rerender();

    // Should still be the same single WebSocket — no reconnections
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(ws.closed).toBe(false);
  });

  it('reconnects when onMessage reference changes', () => {
    let handler = vi.fn();
    const { rerender } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:3000', onMessage: handler }),
    );

    expect(MockWebSocket.instances).toHaveLength(1);
    const ws1 = MockWebSocket.instances[0];
    ws1.simulateOpen();

    // Change the onMessage reference — this should cause a reconnection
    handler = vi.fn();
    rerender();

    expect(MockWebSocket.instances).toHaveLength(2);
    expect(ws1.closed).toBe(true);
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
