import { type ConnectionStatus, useUiStore } from '../stores/useUiStore';

export function setConnectionStatus(status: ConnectionStatus): void {
  useUiStore.getState().setConnectionStatus(status);
}

export function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function reportError(message: string): void {
  useUiStore.getState().pushToast({ kind: 'error', message });
}
