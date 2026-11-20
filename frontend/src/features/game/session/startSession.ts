import { useI18n } from '../../../shared/i18n';
import type { GameConnectionManager } from '../../../shared/realtime/gameConnection';
import { logSession } from '../stores/useSessionLog';
import { autoJoinFromInvite, resumeSavedSession } from './roomSession';
import { errText, reportError, setConnectionStatus } from './sessionFeedback';

let startupResumeAttempted = false;
let pendingStart: Promise<void> | null = null;

/** Test helper: allows re-running the one-time startup session resume. */
export function resetStartupForTests(): void {
  startupResumeAttempted = false;
  pendingStart = null;
}

/**
 * Starts the shared connection once. On the first successful start it resumes a saved
 * session, or — when the tab had none — follows a `?room=` invite link.
 */
export function startSession(conn: GameConnectionManager): void {
  if (conn.isConnected) {
    startupResumeAttempted = true;
    return;
  }
  setConnectionStatus('Connecting');
  pendingStart ??= conn.start();
  void pendingStart
    .then(async () => {
      pendingStart = null;
      // start() is a no-op while SignalR is still reconnecting; onReconnected reports that.
      if (conn.isConnected) setConnectionStatus('Connected');
      logSession('Connected to SignalR GameHub');
      if (!startupResumeAttempted) {
        startupResumeAttempted = true;
        // A saved session owns the tab: an invite link never opens a second seat next to it.
        const hadSession = conn.getSession() !== null;
        const resumed = await resumeSavedSession(conn, { resetOnFailure: true });
        if (resumed) logSession('Session resumed after page load');
        if (!hadSession) await autoJoinFromInvite(conn);
      }
    })
    .catch((err: unknown) => {
      pendingStart = null;
      setConnectionStatus('Error');
      logSession(`Failed to connect: ${errText(err)}`);
      reportError(useI18n.getState().t.network.connectionError);
    });
}
