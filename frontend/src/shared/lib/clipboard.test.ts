import { describe, expect, it, vi } from 'vitest';

import { copyText } from './clipboard';

describe('copyText', () => {
  it('returns false for empty text without touching clipboard APIs', async () => {
    const writeText = vi.fn();
    const legacyCopy = vi.fn();
    expect(await copyText('', { writeText, legacyCopy })).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(legacyCopy).not.toHaveBeenCalled();
  });

  it('uses Async Clipboard API when available and skips legacy fallback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const legacyCopy = vi.fn().mockReturnValue(true);

    expect(await copyText('https://example.test/?room=A', { writeText, legacyCopy })).toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://example.test/?room=A');
    expect(legacyCopy).not.toHaveBeenCalled();
  });

  it('falls back to legacy copy when navigator.clipboard is unavailable', async () => {
    const legacyCopy = vi.fn().mockReturnValue(true);

    expect(await copyText('CYBER-7X9', { legacyCopy })).toBe(true);
    expect(legacyCopy).toHaveBeenCalledWith('CYBER-7X9');
  });

  it('falls back to legacy copy when Async Clipboard rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    const legacyCopy = vi.fn().mockReturnValue(true);

    expect(await copyText('CYBER-7X9', { writeText, legacyCopy })).toBe(true);
    expect(writeText).toHaveBeenCalledWith('CYBER-7X9');
    expect(legacyCopy).toHaveBeenCalledWith('CYBER-7X9');
  });

  it('returns false when both Async Clipboard and legacy copy fail or are missing', async () => {
    expect(await copyText('CYBER-7X9', {})).toBe(false);
    expect(
      await copyText('CYBER-7X9', {
        writeText: vi.fn().mockRejectedValue(new Error('denied')),
        legacyCopy: vi.fn().mockReturnValue(false),
      })
    ).toBe(false);
    expect(
      await copyText('CYBER-7X9', {
        legacyCopy: vi.fn().mockImplementation(() => {
          throw new Error('blocked');
        }),
      })
    ).toBe(false);
  });
});
