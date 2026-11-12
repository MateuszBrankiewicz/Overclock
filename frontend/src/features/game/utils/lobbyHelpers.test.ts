import { describe, expect, it, vi } from 'vitest';

import type { PlayerSeat } from '../schemas/gameEvents';
import { getIntermissionFallback, HOST_GRACE_SECONDS } from './intermissionFallback';
import { buildInviteUrl, readRoomParam, stripRoomParam } from './invite';
import { reduceLeaveConfirm } from './leaveConfirm';
import { loadNickname, NICKNAME_STORAGE_KEY, saveNickname } from './nickname';
import { buildPodium } from './podium';
import { shareInvite } from './shareInvite';

const seat = (playerId: string, status: PlayerSeat['status'] = 'Active'): PlayerSeat => ({
  playerId,
  nickname: playerId.toUpperCase(),
  status,
  isReady: true,
  handCount: 0,
});

describe('nickname persistence', () => {
  it('returns the saved nickname when present', () => {
    expect(loadNickname({ getItem: () => ' Neo ' })).toBe('Neo');
  });

  it('falls back to a random Player_NNN when nothing is saved or storage throws', () => {
    expect(loadNickname({ getItem: () => null }, () => 0)).toBe('Player_100');
    expect(
      loadNickname(
        {
          getItem: () => {
            throw new Error('blocked');
          },
        },
        () => 0.5
      )
    ).toBe('Player_550');
    expect(loadNickname(null, () => 0)).toBe('Player_100');
  });

  it('saves trimmed non-empty nicknames and survives storage errors', () => {
    const setItem = vi.fn();
    saveNickname('  Trinity ', { setItem });
    expect(setItem).toHaveBeenCalledWith(NICKNAME_STORAGE_KEY, 'Trinity');
    saveNickname('   ', { setItem });
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(() =>
      saveNickname('x', {
        setItem: () => {
          throw new Error('quota');
        },
      })
    ).not.toThrow();
  });
});

describe('invite url helpers', () => {
  it('sets and strips the room parameter, preserving other params', () => {
    const url = buildInviteUrl('https://x.test/play?lang=pl', 'CYBER-7X9');
    expect(new URL(url).searchParams.get('room')).toBe('CYBER-7X9');
    expect(new URL(url).searchParams.get('lang')).toBe('pl');
    expect(stripRoomParam(url)).toBe('https://x.test/play?lang=pl');
    expect(stripRoomParam('https://x.test/')).toBe('https://x.test/');
  });

  it('reads the room param upper-cased for prefilling the join field', () => {
    expect(readRoomParam('?room=cyber-7x9')).toBe('CYBER-7X9');
    expect(readRoomParam('')).toBe('');
  });
});

describe('shareInvite', () => {
  const data = { title: 't', text: 'x', url: 'https://x.test/?room=A' };

  it('uses the Web Share API when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    expect(await shareInvite(data, { share })).toBe('shared');
    expect(share).toHaveBeenCalledWith(data);
  });

  it('treats a dismissed share sheet as cancelled without copying', async () => {
    const writeText = vi.fn();
    const abort = Object.assign(new Error('abort'), { name: 'AbortError' });
    expect(await shareInvite(data, { share: () => Promise.reject(abort), writeText })).toBe(
      'cancelled'
    );
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the link when sharing is unavailable, and reports failure otherwise', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareInvite(data, { writeText })).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(data.url);
    expect(await shareInvite(data, {})).toBe('failed');
  });
});

describe('buildPodium', () => {
  it('puts the winner first and orders eliminated players by placement', () => {
    const players = [seat('a', 'Eliminated'), seat('b'), seat('c', 'Eliminated'), seat('d', 'Eliminated')];
    const podium = buildPodium(players, { a: 4, c: 2, d: 3 }, 'b');
    expect(podium.map((e) => e.playerId)).toEqual(['b', 'c', 'd', 'a']);
    expect(podium.map((e) => e.placement)).toEqual([1, 2, 3, 4]);
    expect(podium[0].isWinner).toBe(true);
  });

  it('ranks players without a recorded placement last, in seat order', () => {
    const podium = buildPodium([seat('a'), seat('b'), seat('c')], { c: 2 }, 'a');
    expect(podium.map((e) => e.playerId)).toEqual(['a', 'c', 'b']);
  });
});

describe('getIntermissionFallback', () => {
  const players = [seat('host'), seat('p2'), seat('p3')];
  const base = { countdown: 0, graceElapsed: false, isHost: false, hostId: 'host', myPlayerId: 'p3', players };

  it('shows nothing while counting down or for the host', () => {
    expect(getIntermissionFallback({ ...base, countdown: 2 })).toBe('none');
    expect(getIntermissionFallback({ ...base, isHost: true })).toBe('none');
  });

  it('asks non-hosts to wait, and keeps waiting while the host is still seated', () => {
    expect(getIntermissionFallback(base)).toBe('waitingForHost');
    expect(getIntermissionFallback({ ...base, graceElapsed: true })).toBe('waitingForHost');
    expect(HOST_GRACE_SECONDS).toBeGreaterThan(0);
  });

  it('declares the host gone after the grace period and promotes the first active seat', () => {
    const gone = players.filter((p) => p.playerId !== 'host');
    const input = { ...base, graceElapsed: true, players: gone };
    expect(getIntermissionFallback(input)).toBe('hostGone');
    expect(getIntermissionFallback({ ...input, myPlayerId: 'p2' })).toBe('promoted');
    const disconnected = [seat('host', 'Disconnected'), seat('p2'), seat('p3')];
    expect(getIntermissionFallback({ ...base, graceElapsed: true, players: disconnected })).toBe(
      'hostGone'
    );
  });
});

describe('reduceLeaveConfirm', () => {
  it('requires an explicit confirmation before leaving', () => {
    expect(reduceLeaveConfirm('idle', 'request')).toEqual({ state: 'confirming', shouldLeave: false });
    expect(reduceLeaveConfirm('confirming', 'confirm')).toEqual({ state: 'idle', shouldLeave: true });
    expect(reduceLeaveConfirm('confirming', 'cancel')).toEqual({ state: 'idle', shouldLeave: false });
    expect(reduceLeaveConfirm('idle', 'confirm').shouldLeave).toBe(false);
  });
});
