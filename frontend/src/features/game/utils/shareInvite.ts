import { copyText, legacyCopyText } from '../../../shared/lib/clipboard';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

export interface ShareEnv {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
  legacyCopy?: (text: string) => boolean;
}

function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'name' in err && err.name === 'AbortError';
}

export function getShareEnv(): ShareEnv {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  return {
    canShare: typeof nav?.canShare === 'function' ? (d) => nav.canShare(d) : undefined,
    share: typeof nav?.share === 'function' ? (d) => nav.share(d) : undefined,
    writeText: nav?.clipboard?.writeText ? (text) => nav.clipboard.writeText(text) : undefined,
    legacyCopy: legacyCopyText,
  };
}

/** Uses the Web Share API when available, otherwise copies the invite link. */
export async function shareInvite(
  data: ShareData,
  env: ShareEnv = getShareEnv()
): Promise<ShareOutcome> {
  if (env.share && (!env.canShare || env.canShare(data))) {
    try {
      await env.share(data);
      return 'shared';
    } catch (err) {
      if (isAbortError(err)) return 'cancelled';
      // fall through to clipboard when sharing itself failed
    }
  }
  const copied = await copyText(data.url, {
    writeText: env.writeText,
    legacyCopy: env.legacyCopy,
  });
  return copied ? 'copied' : 'failed';
}
