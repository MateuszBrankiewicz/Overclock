import { create } from 'zustand';

interface SessionLogState {
  lastLog: string;
  log: (message: string) => void;
}

/** Latest line of the realtime session log, shown by the debug terminal. */
export const useSessionLog = create<SessionLogState>((set) => ({
  lastLog: 'Terminal initialized',
  log: (message) => set({ lastLog: `[${new Date().toLocaleTimeString()}] ${message}` }),
}));

export function logSession(message: string): void {
  useSessionLog.getState().log(message);
}
