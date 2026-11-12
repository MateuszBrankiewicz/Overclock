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

/** Returns the saved nickname, or a fresh random one when nothing usable is stored. */
export function loadNickname(
  storage: ReadableStorage | null = defaultStorage(),
  random: () => number = Math.random
): string {
  try {
    const saved = storage?.getItem(NICKNAME_STORAGE_KEY)?.trim();
    if (saved) return saved;
  } catch {
    // storage unavailable: fall through to a random nickname
  }
  return generateNickname(random);
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
