export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareEnv {
  share?: (data: { title: string; text: string; url: string }) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
}

export function getShareEnv(): ShareEnv {
  if (typeof navigator === 'undefined') return {};
  const nav = navigator;
  return {
    share: typeof nav.share === 'function' ? (d) => nav.share(d) : undefined,
    writeText: nav.clipboard?.writeText ? (text) => nav.clipboard.writeText(text) : undefined,
  };
}

/** Uses the Web Share API when available, otherwise copies the invite link. */
export async function shareInvite(
  data: { title: string; text: string; url: string },
  env: ShareEnv = getShareEnv()
): Promise<ShareOutcome> {
  if (env.share) {
    try {
      await env.share(data);
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
      // fall through to clipboard when sharing itself failed
    }
  }
  if (!env.writeText) return 'failed';
  try {
    await env.writeText(data.url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
