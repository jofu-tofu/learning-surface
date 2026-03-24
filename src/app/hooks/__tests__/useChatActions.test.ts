import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChatActions } from '../useChatActions.js';
import { INITIAL_SURFACE_STATE, type SurfaceState } from '../surfaceReducer.js';
import { DRAFT_CHAT_ID } from '../../../shared/types.js';

function state(overrides: Partial<SurfaceState> = {}): SurfaceState {
  return { ...INITIAL_SURFACE_STATE, ...overrides };
}

describe('useChatActions', () => {
  it('newChat is idempotent when already on draft chat', () => {
    const send = vi.fn();
    const setState = vi.fn();
    const s = state({ activeChatId: DRAFT_CHAT_ID });

    const { result } = renderHook(() => useChatActions(s, setState, send));

    result.current.newChat();

    expect(setState).toHaveBeenCalledTimes(1);
    const updater = setState.mock.calls[0][0] as (prev: SurfaceState) => SurfaceState;
    const prev = state({ activeChatId: DRAFT_CHAT_ID });
    const next = updater(prev);

    // Should return the exact same reference — no state change
    expect(next).toBe(prev);
  });

  it('switchChat sends switch-chat message', () => {
    const send = vi.fn();
    const setState = vi.fn();
    const s = state();

    const { result } = renderHook(() => useChatActions(s, setState, send));

    result.current.switchChat('abc');

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ type: 'switch-chat', chatId: 'abc' });
  });
});
