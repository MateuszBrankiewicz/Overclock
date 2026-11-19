import { useI18n } from '../../../shared/i18n';
import { createGameConnection, GameConnectionManager } from '../../../shared/realtime/gameConnection';
import { logSession } from '../stores/useSessionLog';
import { resumeSavedSession } from './roomSession';
import { reportError, setConnectionStatus } from './sessionFeedback';

let sharedConnection: GameConnectionManager | null = null;

/** Test helper: forgets the app-wide connection so the next call creates a fresh one. */
export function resetSharedConnectionForTests(): void {
  sharedConnection = null;
}

/** The app-wide connection if it was already created, without creating one. */
export function peekSharedConnection(): GameConnectionManager | null {
  return sharedConnection;
}

/** Lazily creates the app-wide SignalR connection wired to the UI store. */
export function getSharedConnection(): GameConnectionManager {
  if (sharedConnection) return sharedConnection;
  const created: GameConnectionManager = createGameConnection({
    onReconnecting: () => setConnectionStatus('Reconnecting'),
    onReconnected: async () => {
      setConnectionStatus('Connected');
      await resumeSavedSession(created, { resetOnFailure: false });
    },
    onClosed: () => setConnectionStatus('Disconnected'),
    onContractViolation: (eventName, error) => {
      logSession(`Contract Violation in ${eventName}: ${error.message}`);
      reportError(`${useI18n.getState().t.network.contractViolation} (${eventName})`);
    },
  });
  sharedConnection = created;
  return created;
}

/** Returns the shared connection, starting it first when it is not connected. */
export async function ensureConnected(): Promise<GameConnectionManager> {
  const conn = getSharedConnection();
  if (!conn.isConnected) {
    await conn.start();
    if (conn.isConnected) setConnectionStatus('Connected');
  }
  return conn;
}
