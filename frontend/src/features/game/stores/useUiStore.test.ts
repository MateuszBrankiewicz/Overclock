import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_TOASTS, TOAST_TTL_MS, useUiStore } from './useUiStore';

describe('useUiStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUiStore.setState({ toasts: [], connectionStatus: 'Disconnected' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pushes and dismisses toasts', () => {
    const id = useUiStore.getState().pushToast({ kind: 'error', message: 'boom' });
    expect(useUiStore.getState().toasts).toEqual([{ id, kind: 'error', message: 'boom' }]);
    useUiStore.getState().dismissToast(id);
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });

  it('auto-dismisses after the TTL', () => {
    useUiStore.getState().pushToast({ kind: 'info', message: 'hi' });
    vi.advanceTimersByTime(TOAST_TTL_MS - 1);
    expect(useUiStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(2);
    expect(useUiStore.getState().toasts).toHaveLength(0);
  });

  it('keeps only the newest MAX_TOASTS toasts', () => {
    for (let i = 0; i < MAX_TOASTS + 2; i++) {
      useUiStore.getState().pushToast({ kind: 'success', message: `m${i}` });
    }
    const toasts = useUiStore.getState().toasts;
    expect(toasts).toHaveLength(MAX_TOASTS);
    expect(toasts[toasts.length - 1]?.message).toBe(`m${MAX_TOASTS + 1}`);
  });

  it('updates connection status', () => {
    useUiStore.getState().setConnectionStatus('Reconnecting');
    expect(useUiStore.getState().connectionStatus).toBe('Reconnecting');
  });
});
