import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { z } from 'zod';

export const SESSION_STORAGE_KEY = 'overclock:game:session';

export const StoredGameSessionSchema = z.object({
  roomId: z.string().min(1),
  sessionToken: z.string().uuid(),
});

export type StoredGameSession = z.infer<typeof StoredGameSessionSchema>;

export interface BaseHubResponse {
  isSuccess: boolean;
  error?: string | null;
  errorCode?: string | null;
}

export interface HubResponse<T> extends BaseHubResponse {
  data?: T | null;
}

export const BaseHubResponseSchema: z.ZodType<BaseHubResponse> = z.object({
  isSuccess: z.boolean(),
  error: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
});

export function createHubResponseSchema<T>(
  dataSchema: z.ZodType<T>
): z.ZodType<HubResponse<T>> {
  return z.object({
    isSuccess: z.boolean(),
    data: dataSchema.nullable().optional(),
    error: z.string().nullable().optional(),
    errorCode: z.string().nullable().optional(),
  });
}

export interface GameConnectionOptions {
  hubUrl?: string;
  storage?: Storage;
  logLevel?: LogLevel;
  reconnectDelays?: number[];
  onContractViolation?: (eventName: string, error: z.ZodError, raw: unknown) => void;
  onReconnected?: (connectionId?: string) => void | Promise<void>;
  onReconnecting?: (error?: Error) => void;
  onClosed?: (error?: Error) => void;
}

export function saveGameSession(session: StoredGameSession, storage?: Storage): void {
  const targetStorage = storage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined);
  if (!targetStorage) {
    return;
  }

  const parseResult = StoredGameSessionSchema.safeParse(session);
  if (!parseResult.success) {
    return;
  }

  targetStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parseResult.data));
}

export function loadGameSession(storage?: Storage): StoredGameSession | null {
  const targetStorage = storage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined);
  if (!targetStorage) {
    return null;
  }

  const raw = targetStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const json: unknown = JSON.parse(raw);
    const result = StoredGameSessionSchema.safeParse(json);
    if (!result.success) {
      targetStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return result.data;
  } catch {
    targetStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function clearGameSession(storage?: Storage): void {
  const targetStorage = storage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined);
  if (!targetStorage) {
    return;
  }

  targetStorage.removeItem(SESSION_STORAGE_KEY);
}

export const DEFAULT_GAME_HUB_PATH = '/hubs/game';

export class GameConnectionManager {
  private readonly connection: HubConnection;
  private readonly storage?: Storage;
  private readonly onContractViolation?: (eventName: string, error: z.ZodError, raw: unknown) => void;

  constructor(options: GameConnectionOptions = {}) {
    this.storage = options.storage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined);
    this.onContractViolation = options.onContractViolation;

    const hubUrl = options.hubUrl ?? `${import.meta.env.VITE_API_URL || ''}${DEFAULT_GAME_HUB_PATH}`;
    const reconnectDelays = options.reconnectDelays || [0, 2000, 5000, 10000, 20000];

    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect(reconnectDelays)
      .configureLogging(options.logLevel ?? (import.meta.env.PROD ? LogLevel.Warning : LogLevel.Information))
      .build();

    this.connection.onreconnecting((error) => {
      options.onReconnecting?.(error);
    });

    this.connection.onreconnected((connectionId) => {
      if (options.onReconnected) {
        void options.onReconnected(connectionId);
      }
    });

    this.connection.onclose((error) => {
      options.onClosed?.(error);
    });
  }

  public get rawConnection(): HubConnection {
    return this.connection;
  }

  public get state(): HubConnectionState {
    return this.connection.state;
  }

  public get isConnected(): boolean {
    return this.connection.state === HubConnectionState.Connected;
  }

  public async start(): Promise<void> {
    if (this.connection.state === HubConnectionState.Disconnected) {
      await this.connection.start();
    }
  }

  public async stop(): Promise<void> {
    if (this.connection.state !== HubConnectionState.Disconnected) {
      await this.connection.stop();
    }
  }

  public on<T>(
    eventName: string,
    schema: z.ZodType<T>,
    handler: (payload: T) => void
  ): () => void {
    const listener = (raw: unknown) => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        if (this.onContractViolation) {
          this.onContractViolation(eventName, parsed.error, raw);
        } else {
          console.error(
            `[SignalR Contract Violation] Malformed payload received for event "${eventName}":`,
            parsed.error.issues,
            raw
          );
        }
        return;
      }

      handler(parsed.data);
    };

    this.connection.on(eventName, listener);

    return () => {
      this.connection.off(eventName, listener);
    };
  }

  public async invoke<T>(
    methodName: string,
    responseSchema: z.ZodType<T>,
    ...args: unknown[]
  ): Promise<T> {
    const rawResult: unknown = await this.connection.invoke(methodName, ...args);
    const parsed = responseSchema.safeParse(rawResult);

    if (!parsed.success) {
      const errorMsg = `[SignalR Contract Violation] Response for "${methodName}" does not match schema.`;
      if (this.onContractViolation) {
        this.onContractViolation(methodName, parsed.error, rawResult);
      } else {
        console.error(errorMsg, parsed.error.issues, rawResult);
      }
      throw new Error(errorMsg);
    }

    return parsed.data;
  }

  public async invokeHubMethod<T>(
    methodName: string,
    dataSchema: z.ZodType<T>,
    ...args: unknown[]
  ): Promise<HubResponse<T>> {
    return this.invoke(methodName, createHubResponseSchema(dataSchema), ...args);
  }

  public async invokeHubCommand(
    methodName: string,
    ...args: unknown[]
  ): Promise<BaseHubResponse> {
    return this.invoke(methodName, BaseHubResponseSchema, ...args);
  }

  public saveSession(session: StoredGameSession): void {
    saveGameSession(session, this.storage);
  }

  public getSession(): StoredGameSession | null {
    return loadGameSession(this.storage);
  }

  public clearSession(): void {
    clearGameSession(this.storage);
  }
}

export function createGameConnection(options?: GameConnectionOptions): GameConnectionManager {
  return new GameConnectionManager(options);
}

