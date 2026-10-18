import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  clearGameSession,
  createGameConnection,
  createHubResponseSchema,
  GameConnectionManager,
  type GameConnectionOptions,
  loadGameSession,
  saveGameSession,
  SESSION_STORAGE_KEY,
  type StoredGameSession,
} from './gameConnection';

class MockStorage implements Storage {
  private store: Record<string, string> = {};

  public get length(): number {
    return Object.keys(this.store).length;
  }

  public clear(): void {
    this.store = {};
  }

  public getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  public key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  public removeItem(key: string): void {
    delete this.store[key];
  }

  public setItem(key: string, value: string): void {
    this.store[key] = value;
  }
}

describe('SignalR Connection Manager - Session Storage (TASK-0.8)', () => {
  it('saves and loads a valid session', () => {
    const storage = new MockStorage();
    const session: StoredGameSession = {
      roomId: 'CYBER-7X9',
      sessionToken: '123e4567-e89b-12d3-a456-426614174000',
    };

    saveGameSession(session, storage);
    const loaded = loadGameSession(storage);

    expect(loaded).toEqual(session);
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBe(JSON.stringify(session));
  });

  it('fails safely and cleans up when session storage has invalid UUID', () => {
    const storage = new MockStorage();
    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ roomId: 'CYBER-7X9', sessionToken: 'invalid-uuid' })
    );

    const loaded = loadGameSession(storage);

    expect(loaded).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('fails safely and cleans up when session storage has corrupted JSON', () => {
    const storage = new MockStorage();
    storage.setItem(SESSION_STORAGE_KEY, 'not-a-valid-json{');

    const loaded = loadGameSession(storage);

    expect(loaded).toBeNull();
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('clears session correctly', () => {
    const storage = new MockStorage();
    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        roomId: 'CYBER-7X9',
        sessionToken: '123e4567-e89b-12d3-a456-426614174000',
      })
    );

    clearGameSession(storage);
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});

describe('SignalR Connection Manager - Contract & Event Validation (ADR 0004)', () => {
  const TestEventSchema = z.object({
    playerId: z.string().uuid(),
    action: z.enum(['Draw', 'Play']),
  });

  interface SignalRInternal {
    _methods?: Record<string, Array<(...args: unknown[]) => void>>;
  }

  const createTestConnection = (options: GameConnectionOptions = {}) =>
    createGameConnection({
      hubUrl: 'http://localhost/hubs/game',
      ...options,
    });

  it('dispatches valid incoming event payload to handler', () => {
    const manager = createTestConnection();
    const handler = vi.fn();

    manager.on('TestEvent', TestEventSchema, handler);

    // Trigger internal listener from mock/underlying connection
    const rawConnection = manager.rawConnection;
    const validPayload = {
      playerId: '123e4567-e89b-12d3-a456-426614174000',
      action: 'Play',
    };

    // Simulate SignalR message arrival
    const internal = rawConnection as unknown as SignalRInternal;
    const callbacks = internal._methods?.['testevent'] ?? [];
    expect(callbacks.length).toBeGreaterThan(0);
    callbacks[0](validPayload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(validPayload);
  });

  it('safely rejects malformed event payload without throwing and reports violation', () => {
    const violationHandler = vi.fn();
    const manager = createTestConnection({
      onContractViolation: violationHandler,
    });
    const handler = vi.fn();

    manager.on('TestEvent', TestEventSchema, handler);

    const rawConnection = manager.rawConnection;
    const malformedPayload = {
      playerId: 'not-a-uuid',
      action: 'InvalidAction',
    };

    const internal = rawConnection as unknown as SignalRInternal;
    const callbacks = internal._methods?.['testevent'] ?? [];
    expect(callbacks.length).toBeGreaterThan(0);

    // Must not throw an unhandled error
    expect(() => {
      callbacks[0](malformedPayload);
    }).not.toThrow();

    expect(handler).not.toHaveBeenCalled();
    expect(violationHandler).toHaveBeenCalledTimes(1);
    expect(violationHandler).toHaveBeenCalledWith(
      'TestEvent',
      expect.any(z.ZodError),
      malformedPayload
    );
  });

  it('unsubscribes handler when off callback is called', () => {
    const manager = createTestConnection();
    const handler = vi.fn();

    const unsubscribe = manager.on('TestEvent', TestEventSchema, handler);
    const rawConnection = manager.rawConnection;

    const internal = rawConnection as unknown as SignalRInternal;
    let callbacks = internal._methods?.['testevent'] ?? [];
    expect(callbacks.length).toBe(1);

    unsubscribe();

    callbacks = internal._methods?.['testevent'] ?? [];
    expect(callbacks.length).toBe(0);
  });

  it('validates hub invoke response with HubResponse schema', async () => {
    const manager = createTestConnection();
    const rawConnection = manager.rawConnection;

    const payloadSchema = createHubResponseSchema(
      z.object({
        roomCode: z.string(),
      })
    );

    const mockResponse = {
      isSuccess: true,
      data: { roomCode: 'CYBER-7X9' },
    };

    vi.spyOn(rawConnection, 'invoke').mockResolvedValue(mockResponse);

    const result = await manager.invoke('CreateRoom', payloadSchema, {
      nickname: 'TestUser',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.roomCode).toBe('CYBER-7X9');
  });

  it('rejects malformed invoke response by throwing and reporting violation', async () => {
    const violationHandler = vi.fn();
    const manager = createTestConnection({
      onContractViolation: violationHandler,
    });
    const rawConnection = manager.rawConnection;

    const payloadSchema = createHubResponseSchema(
      z.object({
        roomCode: z.string(),
      })
    );

    const corruptedResponse = {
      isSuccess: 'not-a-boolean',
      data: null,
    };

    vi.spyOn(rawConnection, 'invoke').mockResolvedValue(corruptedResponse);

    await expect(
      manager.invoke('CreateRoom', payloadSchema, { nickname: 'TestUser' })
    ).rejects.toThrow('[SignalR Contract Violation]');

    expect(violationHandler).toHaveBeenCalledWith(
      'CreateRoom',
      expect.any(z.ZodError),
      corruptedResponse
    );
  });

  it('invokes hub method with strongly typed data schema via invokeHubMethod', async () => {
    const manager = createTestConnection();
    const rawConnection = manager.rawConnection;

    const roomSchema = z.object({
      roomCode: z.string(),
      playerId: z.string().uuid(),
    });

    const mockResponse = {
      isSuccess: true,
      data: {
        roomCode: 'CYBER-7X9',
        playerId: '123e4567-e89b-12d3-a456-426614174000',
      },
    };

    vi.spyOn(rawConnection, 'invoke').mockResolvedValue(mockResponse);

    const result = await manager.invokeHubMethod('CreateRoom', roomSchema, {
      hostNickname: 'Alice',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.roomCode).toBe('CYBER-7X9');
    expect(result.data?.playerId).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('invokes hub command with BaseHubResponse via invokeHubCommand', async () => {
    const manager = createTestConnection();
    const rawConnection = manager.rawConnection;

    const mockResponse = {
      isSuccess: true,
    };

    vi.spyOn(rawConnection, 'invoke').mockResolvedValue(mockResponse);

    const result = await manager.invokeHubCommand('SetReady', {
      roomCode: 'CYBER-7X9',
      isReady: true,
    });

    expect(result.isSuccess).toBe(true);
  });

  it('instantiates GameConnectionManager directly', () => {
    const manager = new GameConnectionManager({
      hubUrl: 'http://localhost/hubs/game',
    });
    expect(manager.isConnected).toBe(false);
  });
});
