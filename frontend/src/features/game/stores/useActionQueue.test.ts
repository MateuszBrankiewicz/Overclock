import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useActionQueue } from './useActionQueue';

describe('FIFO Action Queue Manager (TASK-1.2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useActionQueue.getState().resetQueue();
  });

  afterEach(() => {
    useActionQueue.getState().resetQueue();
    vi.useRealTimers();
  });

  it('executes actions sequentially when events arrive in rapid succession', () => {
    const queue = useActionQueue.getState();

    // 3 events arriving within 10ms
    queue.enqueueAction('CardsPlayed', { id: 1 }, { minDurationMs: 300 });
    queue.enqueueAction('TraceCalled', { id: 2 }, { minDurationMs: 300 });
    queue.enqueueAction('RoundStarted', { id: 3 }, { minDurationMs: 300 });

    expect(useActionQueue.getState().activeAction?.type).toBe('CardsPlayed');
    expect(useActionQueue.getState().queue).toHaveLength(2);

    // Complete action 1 after 300ms
    vi.advanceTimersByTime(300);
    useActionQueue.getState().completeCurrentAction();

    expect(useActionQueue.getState().activeAction?.type).toBe('TraceCalled');
    expect(useActionQueue.getState().queue).toHaveLength(1);

    // Complete action 2 after 300ms
    vi.advanceTimersByTime(300);
    useActionQueue.getState().completeCurrentAction();

    expect(useActionQueue.getState().activeAction?.type).toBe('RoundStarted');
    expect(useActionQueue.getState().queue).toHaveLength(0);

    // Complete action 3
    vi.advanceTimersByTime(300);
    useActionQueue.getState().completeCurrentAction();

    expect(useActionQueue.getState().activeAction).toBeNull();
    expect(useActionQueue.getState().isProcessing).toBe(false);
  });

  it('progresses automatically via 2000ms watchdog timeout if animation hangs', () => {
    const queue = useActionQueue.getState();

    queue.enqueueAction('CardsPlayed', { id: 'hanging' }, { minDurationMs: 300 });
    queue.enqueueAction('RoundStarted', { id: 'next' }, { minDurationMs: 300 });

    expect(useActionQueue.getState().activeAction?.type).toBe('CardsPlayed');

    // Do NOT call completeCurrentAction. Advance past 2000ms watchdog
    vi.advanceTimersByTime(2005);

    expect(useActionQueue.getState().activeAction?.type).toBe('RoundStarted');
  });
});

