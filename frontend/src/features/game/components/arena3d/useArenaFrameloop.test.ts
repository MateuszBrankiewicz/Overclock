import { describe, expect, it } from 'vitest';

import { resolveFrameloop } from './useArenaFrameloop';

describe('resolveFrameloop', () => {
  it('pauses rendering while the document is hidden', () => {
    expect(resolveFrameloop(true, 'TurnActive', true)).toBe('never');
    expect(resolveFrameloop(true, 'Lobby', false)).toBe('never');
  });

  it('renders on demand in the idle lobby', () => {
    expect(resolveFrameloop(false, 'Lobby', false)).toBe('demand');
  });

  it('renders continuously in the lobby while the camera is being moved', () => {
    expect(resolveFrameloop(false, 'Lobby', true)).toBe('always');
  });

  it('renders continuously during a match', () => {
    expect(resolveFrameloop(false, 'TurnActive', false)).toBe('always');
    expect(resolveFrameloop(false, 'VoltageTest', false)).toBe('always');
    expect(resolveFrameloop(false, null, false)).toBe('always');
  });
});
