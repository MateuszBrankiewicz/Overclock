export interface ClipboardEnv {
  writeText?: (text: string) => Promise<void>;
  legacyCopy?: (text: string) => boolean;
}

/**
 * Last-resort synchronous copy using a temporary off-screen textarea and `document.execCommand('copy')`.
 * Needed on mobile browsers when the page is served over plain HTTP (non-secure context, where
 * `navigator.clipboard` is undefined) or when Async Clipboard permission is denied in a WebView.
 */
export function legacyCopyText(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) return false;

  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.setAttribute('aria-hidden', 'true');
  // 16px font-size prevents iOS Safari from auto-zooming the viewport on focus.
  field.style.cssText =
    'position:fixed;inset-block-start:0;inset-inline-start:0;opacity:0;font-size:16px;pointer-events:none';

  document.body.append(field);
  try {
    field.focus({ preventScroll: true });
    field.select();
    // Explicit selection range is required on iOS Safari for readonly textareas.
    field.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

export function getClipboardEnv(): ClipboardEnv {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  return {
    writeText: nav?.clipboard?.writeText ? (text) => nav.clipboard.writeText(text) : undefined,
    legacyCopy: legacyCopyText,
  };
}

/**
 * Copies text via the Async Clipboard API, falling back to `legacyCopyText` when
 * `navigator.clipboard` is unavailable (e.g. non-HTTPS mobile LAN) or rejects.
 * Runs the fallback synchronously before any `await` when `writeText` is absent so the
 * user's click/tap gesture is preserved on mobile browsers.
 */
export async function copyText(
  text: string,
  env: ClipboardEnv = getClipboardEnv()
): Promise<boolean> {
  if (!text) return false;

  if (env.writeText) {
    try {
      await env.writeText(text);
      return true;
    } catch {
      // Fall through to legacy copy when Async Clipboard rejects.
    }
  }

  if (!env.legacyCopy) return false;
  try {
    return env.legacyCopy(text);
  } catch {
    return false;
  }
}
