export const NICKNAME_STORAGE_KEY = 'overclock_nickname';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function generateNickname(random: () => number = Math.random): string {
  return 'Player_' + Math.floor(random() * 900 + 100);
}

/** Returns the nickname the player saved earlier, or null when nothing usable is stored. */
export function loadSavedNickname(
  storage: ReadableStorage | null = defaultStorage()
): string | null {
  try {
    return storage?.getItem(NICKNAME_STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

/** Returns the saved nickname, or a fresh random one when nothing usable is stored. */
export function loadNickname(
  storage: ReadableStorage | null = defaultStorage(),
  random: () => number = Math.random
): string {
  return loadSavedNickname(storage) ?? generateNickname(random);
}

export function saveNickname(
  nickname: string,
  storage: WritableStorage | null = defaultStorage()
): void {
  const trimmed = nickname.trim();
  if (!trimmed) return;
  try {
    storage?.setItem(NICKNAME_STORAGE_KEY, trimmed);
  } catch {
    // ignore storage failures
  }
}
