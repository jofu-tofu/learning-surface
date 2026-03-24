import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudyMode } from '../useStudyMode.js';
import { INITIAL_SURFACE_STATE, type SurfaceState } from '../surfaceReducer.js';

function state(overrides: Partial<SurfaceState> = {}): SurfaceState {
  return { ...INITIAL_SURFACE_STATE, ...overrides };
}

describe('useStudyMode', () => {
  it('setStudyMode is a no-op when studyModeLocked is true', () => {
    const setState = vi.fn();
    const s = state({ studyModeLocked: true, studyMode: false });

    const { result } = renderHook(() => useStudyMode(s, setState));

    act(() => result.current.setStudyMode(true));

    expect(setState).toHaveBeenCalledTimes(1);
    const updater = setState.mock.calls[0][0] as (prev: SurfaceState) => SurfaceState;
    const prev = state({ studyModeLocked: true, studyMode: false });
    const next = updater(prev);

    // Should return the exact same reference — locked means no change
    expect(next).toBe(prev);
  });
});
