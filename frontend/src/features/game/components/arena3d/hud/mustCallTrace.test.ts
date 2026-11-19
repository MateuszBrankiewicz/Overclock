import { describe, expect, it } from 'vitest';

import type { PlayerSeat } from '../../../schemas/gameEvents';
import { mustCallTrace } from './mustCallTrace';

const seat = (
  playerId: string,
  handCount: number,
  status: PlayerSeat['status'] = 'Active',
): PlayerSeat => ({
  playerId,
  nickname: playerId,
  status,
  isReady: true,
  handCount,
  riskLevel: 1,
});

describe('mustCallTrace', () => {
  it('forces TRACE when the only rival emptied their hand on the last play', () => {
    expect(mustCallTrace([seat('me', 3), seat('rival', 0)], 'me', 'rival', 2)).toBe(true);
  });

  it('ignores eliminated rivals that still report cards', () => {
    expect(
      mustCallTrace(
        [seat('me', 3), seat('rival', 0), seat('dead', 4, 'Eliminated')],
        'me',
        'rival',
        2,
      ),
    ).toBe(true);
  });

  it('allows playing while another rival still holds cards', () => {
    expect(
      mustCallTrace([seat('me', 3), seat('rival', 0), seat('third', 2)], 'me', 'rival', 2),
    ).toBe(false);
  });

  it('allows playing when nothing is on the table or the last play was mine', () => {
    expect(mustCallTrace([seat('me', 3), seat('rival', 0)], 'me', 'rival', 0)).toBe(false);
    expect(mustCallTrace([seat('me', 3), seat('rival', 0)], 'me', 'me', 2)).toBe(false);
  });
});
