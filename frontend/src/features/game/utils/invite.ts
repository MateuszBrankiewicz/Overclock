export const ROOM_PARAM = 'room';

export function buildInviteUrl(href: string, roomCode: string): string {
  const url = new URL(href);
  url.searchParams.set(ROOM_PARAM, roomCode);
  return url.toString();
}

export function stripRoomParam(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(ROOM_PARAM);
  return url.toString();
}

/** Reads the `?room=` value from a query string, upper-cased; empty string when absent. */
export function readRoomParam(search: string): string {
  return (new URLSearchParams(search).get(ROOM_PARAM) ?? '').trim().toUpperCase();
}

/** Mirrors the current room into the address bar (null removes the parameter). */
export function syncRoomParam(roomCode: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const next = roomCode
      ? buildInviteUrl(window.location.href, roomCode)
      : stripRoomParam(window.location.href);
    if (next !== window.location.href) window.history.replaceState(null, '', next);
  } catch {
    // history API unavailable: invites still work through the button
  }
}
