import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerGameHandlers, resetGameHandlersForTests, retainGameHandlers } from './registerGameHandlers';

function fakeConnection() {
  const off = vi.fn();
  const on = vi.fn(() => off);
  return { conn: { on }, on, off };
}

describe('retainGameHandlers', () => {
  afterEach(() => resetGameHandlersForTests());

  it('registers the event handlers once however many session hooks retain them', () => {
    const { conn, on, off } = fakeConnection();
    const perRegistration = (() => {
      const probe = fakeConnection();
      registerGameHandlers(probe.conn)();
      return probe.on.mock.calls.length;
    })();

    const releaseLobby = retainGameHandlers(conn);
    const releaseTable = retainGameHandlers(conn);
    expect(on).toHaveBeenCalledTimes(perRegistration);

    releaseLobby();
    expect(off).not.toHaveBeenCalled();
    releaseLobby();
    expect(off).not.toHaveBeenCalled();

    releaseTable();
    expect(off).toHaveBeenCalledTimes(perRegistration);
  });

  it('registers again after every holder released', () => {
    const { conn, on } = fakeConnection();
    retainGameHandlers(conn)();
    retainGameHandlers(conn);
    expect(on.mock.calls.length).toBeGreaterThan(0);
    expect(on.mock.calls.length % 2).toBe(0);
  });
});
