export const ROOM_PARAM = 'room';
const JOIN_PATH_REGEX = /^\/join\/([A-Za-z0-9-]+)\/?$/i;

export function buildInviteUrl(href: string, roomCode: string): string {
  const url = new URL(href);
  if (JOIN_PATH_REGEX.test(url.pathname)) {
    url.pathname = '/';
  }
  url.searchParams.set(ROOM_PARAM, roomCode);
  return url.toString();
}

export function stripRoomParam(href: string): string {
  const url = new URL(href);
  if (JOIN_PATH_REGEX.test(url.pathname)) {
    url.pathname = '/';
  }
  url.searchParams.delete(ROOM_PARAM);
  return url.toString();
}

/**
 * Reads the room code from `?room=` or `/join/:roomId`, upper-cased; empty string when absent.
 */
export function readRoomParam(search: string, pathname = ''): string {
  const fromQuery = (new URLSearchParams(search).get(ROOM_PARAM) ?? '').trim().toUpperCase();
  if (fromQuery) {
    return fromQuery;
  }

  const match = JOIN_PATH_REGEX.exec(pathname.trim());
  return match ? match[1].toUpperCase() : '';
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
