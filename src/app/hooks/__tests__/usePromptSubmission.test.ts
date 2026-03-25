import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePromptSubmission } from '../usePromptSubmission.js';
import { INITIAL_SURFACE_STATE, type SurfaceState } from '../surfaceReducer.js';

function state(overrides: Partial<SurfaceState> = {}): SurfaceState {
  return { ...INITIAL_SURFACE_STATE, ...overrides };
}

describe('usePromptSubmission', () => {
  it('sends directly without preflight when no provider is selected', () => {
    const send = vi.fn();
    const setState = vi.fn();
    const s = state();

    const { result } = renderHook(() =>
      usePromptSubmission(s, setState, send, true, {
        selectedProvider: null,
        selectedModel: null,
        selectedReasoningEffort: null,
      }),
    );

    act(() => result.current.submitPrompt('hello'));

    // Should call send directly (no preflight), with a new-chat-with-prompt type (draft)
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'new-chat-with-prompt', text: 'hello' }),
    );
  });

  it('sets isProcessing after submit', () => {
    const send = vi.fn();
    const setState = vi.fn();
    const s = state();

    const { result } = renderHook(() =>
      usePromptSubmission(s, setState, send, false, {
        selectedProvider: null,
        selectedModel: null,
        selectedReasoningEffort: null,
      }),
    );

    act(() => result.current.submitPrompt('test'));

    // setState should be called with an updater function
    expect(setState).toHaveBeenCalledTimes(1);
    const updater = setState.mock.calls[0][0] as (prev: SurfaceState) => SurfaceState;
    const prev = state();
    const next = updater(prev);

    expect(next.isProcessing).toBe(true);
  });

  it('clearPendingPrompt prevents executePendingPromptEffect from sending', () => {
    const send = vi.fn();
    const setState = vi.fn();
    const s = state();

    const { result } = renderHook(() =>
      usePromptSubmission(s, setState, send, false, {
        selectedProvider: 'openai',
        selectedModel: 'gpt-4',
        selectedReasoningEffort: null,
      }),
    );

    // submitPrompt with a provider stores a pending prompt and sends preflight
    act(() => result.current.submitPrompt('pending test'));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'preflight' }),
    );

    send.mockClear();

    // Clear the pending prompt, then try to execute it
    act(() => result.current.clearPendingPrompt());
    act(() => result.current.executePendingPromptEffect());

    expect(send).not.toHaveBeenCalled();
  });

  it('submitResponses sends submit-responses message', () => {
    const send = vi.fn();
    const setState = vi.fn();
    const s = state();

    const { result } = renderHook(() =>
      usePromptSubmission(s, setState, send, false, {
        selectedProvider: null,
        selectedModel: null,
        selectedReasoningEffort: null,
      }),
    );

    act(() => result.current.submitResponses({ b1: 'My answer' }));

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'submit-responses', responses: { b1: 'My answer' } }),
    );
  });
});
