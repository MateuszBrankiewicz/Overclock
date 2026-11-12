import { beforeEach, describe, expect, it } from 'vitest';

import type {
  PlayerCard,
  PlayerJoinedEvent,
  PlayerSeat,
  RoomStateSnapshot,
  TraceResolution,
} from '../schemas/gameEvents';
import { useGameStore } from './useGameStore';

describe('Ephemeral Game Store (Zustand) - TASK-0.9', () => {
  beforeEach(() => {
    useGameStore.getState().leaveRoom();
  });

  describe('Initial State & Room Slice', () => {
    it('initializes with clean default values', () => {
      const state = useGameStore.getState();

      expect(state.roomCode).toBeNull();
      expect(state.roomState).toBeNull();
      expect(state.hostId).toBeNull();
      expect(state.playerId).toBeNull();
      expect(state.isInRoom).toBe(false);
      expect(state.players).toEqual([]);
      expect(state.myCards).toEqual([]);
      expect(state.selectedCardIds).toEqual([]);
      expect(state.tablePileCount).toBe(0);
      expect(state.roundNumber).toBe(0);
      expect(state.remainingTimeSeconds).toBe(15);
    });

    it('sets room code and player ID via setRoom', () => {
      useGameStore.getState().setRoom('CYBER-7X9', '11111111-1111-4111-8111-111111111111');
      const state = useGameStore.getState();

      expect(state.roomCode).toBe('CYBER-7X9');
      expect(state.playerId).toBe('11111111-1111-4111-8111-111111111111');
      expect(state.isInRoom).toBe(true);
    });

    it('applies RoomStateSnapshot correctly across room, hand, and turn slices', () => {
      const mockSnapshot: RoomStateSnapshot = {
        roomCode: 'CYBER-7X9',
        state: 'TurnActive',
        hostId: '22222222-2222-4222-8222-222222222222',
        myPlayerId: '11111111-1111-4111-8111-111111111111',
        myHand: [
          { id: 'c1111111-1111-4111-8111-111111111111', protocol: 'Alpha' },
          { id: 'c2222222-2222-4222-8222-222222222222', protocol: 'Beta' },
        ],
        seats: [
          {
            playerId: '11111111-1111-4111-8111-111111111111',
            nickname: 'PlayerOne',
            status: 'Active',
            isReady: true,
            handCount: 2,
          },
          {
            playerId: '22222222-2222-4222-8222-222222222222',
            nickname: 'PlayerTwo',
            status: 'Active',
            isReady: true,
            handCount: 3,
          },
        ],
        tablePileCount: 4,
        currentTargetProtocol: 'Alpha',
        currentTurnPlayerId: '11111111-1111-4111-8111-111111111111',
        roundNumber: 2,
        winnerId: null,
      };

      useGameStore.getState().applyRoomSnapshot(mockSnapshot);
      const state = useGameStore.getState();

      expect(state.roomCode).toBe('CYBER-7X9');
      expect(state.roomState).toBe('TurnActive');
      expect(state.playerId).toBe('11111111-1111-4111-8111-111111111111');
      expect(state.hostId).toBe('22222222-2222-4222-8222-222222222222');
      expect(state.isInRoom).toBe(true);
      expect(state.myCards).toHaveLength(2);
      expect(state.players).toHaveLength(2);
      expect(state.tablePileCount).toBe(4);
      expect(state.currentTargetProtocol).toBe('Alpha');
      expect(state.activePlayerId).toBe('11111111-1111-4111-8111-111111111111');
      expect(state.roundNumber).toBe(2);
    });

    it('adds or updates players on applyPlayerJoined', () => {
      const seat1: PlayerSeat = {
        playerId: '11111111-1111-4111-8111-111111111111',
        nickname: 'Alice',
        status: 'Active',
        isReady: false,
        handCount: 5,
      };

      useGameStore.getState().applyPlayerJoined(seat1);
      expect(useGameStore.getState().players).toEqual([seat1]);

      // Wrapped event
      const wrappedEvent: PlayerJoinedEvent = {
        type: 'PlayerJoined',
        roomCode: 'CYBER-7X9',
        player: {
          playerId: '22222222-2222-4222-8222-222222222222',
          nickname: 'Bob',
          status: 'Active',
          isReady: true,
          handCount: 5,
        },
      };

      useGameStore.getState().applyPlayerJoined(wrappedEvent);
      expect(useGameStore.getState().players).toHaveLength(2);

      // Re-joining or updating same player ID updates in-place
      const updatedSeat1: PlayerSeat = { ...seat1, isReady: true };
      useGameStore.getState().applyPlayerJoined(updatedSeat1);
      expect(useGameStore.getState().players).toHaveLength(2);
      expect(useGameStore.getState().players[0].isReady).toBe(true);
    });

    it('updates player status via applyPlayerStatusChanged', () => {
      const seat: PlayerSeat = {
        playerId: '11111111-1111-4111-8111-111111111111',
        nickname: 'Alice',
        status: 'Active',
        isReady: true,
        handCount: 4,
      };

      useGameStore.getState().applyPlayerJoined(seat);
      useGameStore.getState().applyPlayerStatusChanged({
        playerId: '11111111-1111-4111-8111-111111111111',
        status: 'Disconnected',
      });

      expect(useGameStore.getState().players[0].status).toBe('Disconnected');
    });

    it('applies capacitor discharge updating resulting risk and overload status', () => {
      const seat: PlayerSeat = {
        playerId: '11111111-1111-4111-8111-111111111111',
        nickname: 'Alice',
        status: 'Active',
        isReady: true,
        handCount: 4,
        riskLevel: 1,
      };

      useGameStore.getState().applyPlayerJoined(seat);
      useGameStore.getState().applyCapacitorDischarged({
        type: 'CapacitorDischarged',
        roomCode: 'CYBER-7X9',
        playerId: '11111111-1111-4111-8111-111111111111',
        roll: 4,
        riskLevel: 2,
        resultingRiskLevel: 3,
        overloaded: false,
      });

      const state = useGameStore.getState();
      expect(state.players[0].riskLevel).toBe(3);
      expect(state.players[0].status).toBe('Active');
      expect(state.lastDischargeOutcome?.overloaded).toBe(false);
    });

    it('marks player as eliminated on overload or elimination event', () => {
      const seat: PlayerSeat = {
        playerId: '11111111-1111-4111-8111-111111111111',
        nickname: 'Alice',
        status: 'Active',
        isReady: true,
        handCount: 4,
        riskLevel: 5,
      };

      useGameStore.getState().applyPlayerJoined(seat);
      useGameStore.getState().applyCapacitorDischarged({
        type: 'CapacitorDischarged',
        roomCode: 'CYBER-7X9',
        playerId: '11111111-1111-4111-8111-111111111111',
        roll: 3,
        riskLevel: 5,
        resultingRiskLevel: 5,
        overloaded: true,
      });

      expect(useGameStore.getState().players[0].status).toBe('Eliminated');

      useGameStore.getState().applyPlayerEliminated({
        type: 'PlayerEliminated',
        roomCode: 'CYBER-7X9',
        playerId: '11111111-1111-4111-8111-111111111111',
        placement: 2,
      });

      expect(useGameStore.getState().players[0].status).toBe('Eliminated');
    });

    it('applies exploit triggered and burns exploit on seat', () => {
      const seat: PlayerSeat = {
        playerId: '11111111-1111-4111-8111-111111111111',
        nickname: 'Alice',
        status: 'Active',
        isReady: true,
        handCount: 4,
        riskLevel: 2,
        exploit: { type: 'PacketSniffer', isBurned: false },
      };

      useGameStore.getState().applyPlayerJoined(seat);
      useGameStore.getState().applyExploitTriggered({
        type: 'ExploitTriggered',
        roomCode: 'CYBER-7X9',
        playerId: '11111111-1111-4111-8111-111111111111',
        exploit: 'PacketSniffer',
      });

      const state = useGameStore.getState();
      expect(state.players[0].exploit?.isBurned).toBe(true);
    });
  });

  describe('Hand Slice & Card Selection', () => {
    const cards: PlayerCard[] = [
      { id: 'card-1', protocol: 'Alpha' },
      { id: 'card-2', protocol: 'Alpha' },
      { id: 'card-3', protocol: 'Beta' },
      { id: 'card-4', protocol: 'Glitch' },
    ];

    beforeEach(() => {
      useGameStore.getState().setMyCards(cards);
    });

    it('toggles card selection respecting maximum of 3 cards', () => {
      const store = useGameStore.getState();

      store.toggleCardSelection('card-1');
      store.toggleCardSelection('card-2');
      store.toggleCardSelection('card-3');
      expect(useGameStore.getState().selectedCardIds).toEqual(['card-1', 'card-2', 'card-3']);

      // Attempting 4th selection is ignored
      useGameStore.getState().toggleCardSelection('card-4');
      expect(useGameStore.getState().selectedCardIds).toEqual(['card-1', 'card-2', 'card-3']);

      // Toggling off
      useGameStore.getState().toggleCardSelection('card-2');
      expect(useGameStore.getState().selectedCardIds).toEqual(['card-1', 'card-3']);
    });

    it('ignores selecting cards not in my hand', () => {
      useGameStore.getState().toggleCardSelection('not-in-hand');
      expect(useGameStore.getState().selectedCardIds).toEqual([]);

      useGameStore.getState().selectCard('not-in-hand');
      expect(useGameStore.getState().selectedCardIds).toEqual([]);
    });

    it('selects, deselects and clears selection explicitly', () => {
      useGameStore.getState().selectCard('card-1');
      useGameStore.getState().selectCard('card-2');
      expect(useGameStore.getState().selectedCardIds).toEqual(['card-1', 'card-2']);

      useGameStore.getState().deselectCard('card-1');
      expect(useGameStore.getState().selectedCardIds).toEqual(['card-2']);

      useGameStore.getState().clearSelection();
      expect(useGameStore.getState().selectedCardIds).toEqual([]);
    });

    it('prunes selected cards when myCards is updated', () => {
      useGameStore.getState().selectCard('card-1');
      useGameStore.getState().selectCard('card-2');

      // Update hand omitting card-2
      useGameStore.getState().setMyCards([{ id: 'card-1', protocol: 'Alpha' }]);
      expect(useGameStore.getState().selectedCardIds).toEqual(['card-1']);
    });

    it('avoids state mutation when deselecting an unselected card or clearing empty selection', () => {
      const stateBefore = useGameStore.getState();
      useGameStore.getState().deselectCard('card-999');
      expect(useGameStore.getState().selectedCardIds).toBe(stateBefore.selectedCardIds);

      useGameStore.getState().clearSelection();
      expect(useGameStore.getState().selectedCardIds).toBe(stateBefore.selectedCardIds);
    });
  });

  describe('Turn Slice & Gameplay Transitions', () => {
    it('sets currentTargetProtocol from CardsPlayed when initially null', () => {
      useGameStore.getState().applyCardsPlayed({
        playerId: '22222222-2222-4222-8222-222222222222',
        cardCount: 2,
        declaredProtocol: 'Beta',
      });
      expect(useGameStore.getState().currentTargetProtocol).toBe('Beta');
    });

    it('handles RoundStarted event and resets round state and card selection', () => {
      useGameStore.getState().setMyCards([{ id: 'c1', protocol: 'Alpha' }]);
      useGameStore.getState().selectCard('c1');
      expect(useGameStore.getState().selectedCardIds).toEqual(['c1']);

      useGameStore.getState().applyRoundStarted({
        type: 'RoundStarted',
        roomCode: 'CYBER-7X9',
        roundNumber: 3,
        leadProtocol: 'Gamma',
        activePlayerId: '33333333-3333-4333-8333-333333333333',
      });

      const state = useGameStore.getState();
      expect(state.roundNumber).toBe(3);
      expect(state.roomState).toBe('TurnActive');
      expect(state.currentTargetProtocol).toBe('Gamma');
      expect(state.activePlayerId).toBe('33333333-3333-4333-8333-333333333333');
      expect(state.tablePileCount).toBe(0);
      expect(state.remainingTimeSeconds).toBe(15);
      expect(state.selectedCardIds).toEqual([]);
      expect(state.lastTrace).toBeNull();
    });

    it('handles CardsPlayed event and updates pile, seat counts, and selection', () => {
      const myId = '11111111-1111-4111-8111-111111111111';
      const otherId = '22222222-2222-4222-8222-222222222222';

      useGameStore.getState().setRoom('CYBER-7X9', myId);
      useGameStore.getState().applyPlayerJoined({
        playerId: myId,
        nickname: 'Alice',
        status: 'Active',
        isReady: true,
        handCount: 5,
      });
      useGameStore.getState().applyPlayerJoined({
        playerId: otherId,
        nickname: 'Bob',
        status: 'Active',
        isReady: true,
        handCount: 5,
      });

      useGameStore.getState().setMyCards([
        { id: 'c1', protocol: 'Alpha' },
        { id: 'c2', protocol: 'Alpha' },
      ]);
      useGameStore.getState().selectCard('c1');

      // Other player plays 2 cards
      useGameStore.getState().applyCardsPlayed({
        playerId: otherId,
        cardCount: 2,
        declaredProtocol: 'Alpha',
      });

      expect(useGameStore.getState().tablePileCount).toBe(2);
      expect(useGameStore.getState().players.find((p) => p.playerId === otherId)?.handCount).toBe(3);
      // Alice's selection not cleared when Bob plays
      expect(useGameStore.getState().selectedCardIds).toEqual(['c1']);

      // Local player plays 1 card -> clears selection and prunes myCards
      useGameStore.getState().applyCardsPlayed({
        playerId: myId,
        cardCount: 1,
        declaredProtocol: 'Alpha',
      });

      expect(useGameStore.getState().tablePileCount).toBe(3);
      expect(useGameStore.getState().players.find((p) => p.playerId === myId)?.handCount).toBe(4);
      expect(useGameStore.getState().selectedCardIds).toEqual([]);
      expect(useGameStore.getState().myCards).toEqual([{ id: 'c2', protocol: 'Alpha' }]);
    });

    it('safely retains myCards when selectedCardIds count does not match cardCount in CardsPlayed', () => {
      const myId = '11111111-1111-4111-8111-111111111111';
      useGameStore.getState().setRoom('CYBER-7X9', myId);
      useGameStore.getState().setMyCards([
        { id: 'c1', protocol: 'Alpha' },
        { id: 'c2', protocol: 'Alpha' },
      ]);
      // Selection cleared before network event arrived
      useGameStore.getState().clearSelection();

      useGameStore.getState().applyCardsPlayed({
        playerId: myId,
        cardCount: 2,
        declaredProtocol: 'Alpha',
      });

      // Does not prune cards randomly; preserves hand for authoritative snapshot
      expect(useGameStore.getState().myCards).toHaveLength(2);
      expect(useGameStore.getState().selectedCardIds).toEqual([]);
    });

    it('handles TraceCalled event and transitions room state to BluffCheck', () => {
      useGameStore.getState().applyTraceCalled({
        type: 'TraceCalled',
        roomCode: 'CYBER-7X9',
        callerId: '11111111-1111-4111-8111-111111111111',
        accusedPlayerId: '22222222-2222-4222-8222-222222222222',
        revealedCards: [],
        bluffDetected: true,
      });

      const state = useGameStore.getState();
      expect(state.lastTrace).not.toBeNull();
      expect(state.roomState).toBe('BluffCheck');
    });

    it('handles TraceResolution event and transitions room state respecting GameOver', () => {
      const resolution: TraceResolution = {
        accuserPlayerId: '11111111-1111-4111-8111-111111111111',
        accusedPlayerId: '22222222-2222-4222-8222-222222222222',
        loserPlayerId: '22222222-2222-4222-8222-222222222222',
        revealedCards: [{ id: 'c1', protocol: 'Corrupted' }],
        declaredProtocol: 'Alpha',
        bluffDetected: true,
      };

      useGameStore.getState().applyTraceResolution(resolution);
      let state = useGameStore.getState();

      expect(state.lastTraceResolution).toEqual(resolution);
      expect(state.tablePileCount).toBe(0);
      expect(state.roomState).toBe('RoundOver');

      // If room is already in GameOver, applyTraceResolution should not downgrade to RoundOver
      useGameStore.setState({ roomState: 'GameOver' });
      useGameStore.getState().applyTraceResolution(resolution);
      state = useGameStore.getState();
      expect(state.roomState).toBe('GameOver');
    });

    it('applies authoritative turnDeadlineUtc from snapshot, null when absent', () => {
      const futureDeadline = new Date(Date.now() + 8000).toISOString();
      useGameStore.getState().applyRoomSnapshot({
        roomCode: 'CYBER-7X9',
        state: 'TurnActive',
        hostId: '11111111-1111-4111-8111-111111111111',
        myPlayerId: '11111111-1111-4111-8111-111111111111',
        myHand: [],
        seats: [],
        tablePileCount: 0,
        roundNumber: 1,
        turnDeadlineUtc: futureDeadline,
      });

      expect(useGameStore.getState().turnDeadlineUtc).toBe(futureDeadline);

      // Snapshot without turnDeadlineUtc -> sets null
      useGameStore.getState().applyRoomSnapshot({
        roomCode: 'CYBER-7X9',
        state: 'Lobby',
        hostId: '11111111-1111-4111-8111-111111111111',
        myPlayerId: '11111111-1111-4111-8111-111111111111',
        myHand: [],
        seats: [],
        tablePileCount: 0,
        roundNumber: 1,
      });

      expect(useGameStore.getState().turnDeadlineUtc).toBeNull();
    });

    it('applies authoritative intermissionDeadlineUtc from snapshot and clears it on RoundStarted', () => {
      const intermissionDeadline = new Date(Date.now() + 10000).toISOString();
      useGameStore.getState().applyRoomSnapshot({
        roomCode: 'CYBER-7X9',
        state: 'RoundOver',
        hostId: '11111111-1111-4111-8111-111111111111',
        myPlayerId: '11111111-1111-4111-8111-111111111111',
        myHand: [],
        seats: [],
        tablePileCount: 0,
        roundNumber: 1,
        intermissionDeadlineUtc: intermissionDeadline,
      });

      expect(useGameStore.getState().intermissionDeadlineUtc).toBe(intermissionDeadline);

      useGameStore.getState().applyRoundStarted({
        type: 'RoundStarted',
        roomCode: 'CYBER-7X9',
        roundNumber: 2,
        leadProtocol: 'Alpha',
        activePlayerId: '11111111-1111-4111-8111-111111111111',
      });

      expect(useGameStore.getState().intermissionDeadlineUtc).toBeNull();
    });

    it('reconnect mid-turn preserves server deadline reflecting remaining time rather than 15s', () => {
      const remainingMs = 6000;
      const midTurnDeadline = new Date(Date.now() + remainingMs).toISOString();

      useGameStore.getState().applyRoomSnapshot({
        roomCode: 'CYBER-7X9',
        state: 'TurnActive',
        hostId: '11111111-1111-4111-8111-111111111111',
        myPlayerId: '11111111-1111-4111-8111-111111111111',
        myHand: [],
        seats: [],
        tablePileCount: 2,
        roundNumber: 1,
        currentTurnPlayerId: '11111111-1111-4111-8111-111111111111',
        turnDeadlineUtc: midTurnDeadline,
      });

      const deadline = useGameStore.getState().turnDeadlineUtc;
      expect(deadline).toBe(midTurnDeadline);
      const remainingSeconds = Math.ceil((new Date(deadline!).getTime() - Date.now()) / 1000);
      expect(remainingSeconds).toBeLessThanOrEqual(6);
      expect(remainingSeconds).toBeGreaterThanOrEqual(5);
    });

    it('manages timer ticks without going negative', () => {
      useGameStore.getState().setRemainingTime(2);
      expect(useGameStore.getState().remainingTimeSeconds).toBe(2);

      useGameStore.getState().tickRemainingTime();
      expect(useGameStore.getState().remainingTimeSeconds).toBe(1);

      useGameStore.getState().tickRemainingTime();
      expect(useGameStore.getState().remainingTimeSeconds).toBe(0);

      useGameStore.getState().tickRemainingTime();
      expect(useGameStore.getState().remainingTimeSeconds).toBe(0);
    });

    it('resets game state while retaining room membership', () => {
      useGameStore.getState().setRoom('CYBER-7X9', '11111111-1111-4111-8111-111111111111');
      useGameStore.getState().setMyCards([{ id: 'c1', protocol: 'Alpha' }]);
      useGameStore.getState().applyTraceResolution({
        accuserPlayerId: '11111111-1111-4111-8111-111111111111',
        accusedPlayerId: '22222222-2222-4222-8222-222222222222',
        loserPlayerId: '22222222-2222-4222-8222-222222222222',
        revealedCards: [],
        declaredProtocol: 'Alpha',
        bluffDetected: false,
      });
      useGameStore.getState().resetGame();

      const state = useGameStore.getState();
      expect(state.roomCode).toBe('CYBER-7X9');
      expect(state.playerId).toBe('11111111-1111-4111-8111-111111111111');
      expect(state.isInRoom).toBe(true);
      expect(state.roomState).toBe('Lobby');
      expect(state.winnerId).toBeNull();
      expect(state.myCards).toEqual([]);
      expect(state.tablePileCount).toBe(0);
    });

    it('preserves dischargeDeadlineUtc in applyRoomSnapshot when room is in VoltageTest', () => {
      const deadline = new Date(Date.now() + 5000).toISOString();
      useGameStore.getState().applyVoltageTestStarted({
        type: 'VoltageTestStarted',
        roomCode: 'CYBER-7X9',
        pendingPlayerId: '11111111-1111-4111-8111-111111111111',
        decisionDeadlineUtc: deadline,
      });

      expect(useGameStore.getState().dischargeDeadlineUtc).toBe(deadline);

      // Snapshot with null dischargeDeadlineUtc must preserve active deadline during VoltageTest
      useGameStore.getState().applyRoomSnapshot({
        roomCode: 'CYBER-7X9',
        state: 'VoltageTest',
        hostId: '11111111-1111-4111-8111-111111111111',
        myPlayerId: '11111111-1111-4111-8111-111111111111',
        myHand: [],
        seats: [],
        tablePileCount: 0,
        roundNumber: 1,
        dischargeDeadlineUtc: null,
      });

      expect(useGameStore.getState().dischargeDeadlineUtc).toBe(deadline);
    });

    it('clears sniffedCard and lastDischargeOutcome appropriately across turns and events', () => {
      useGameStore.getState().applyPacketSniffed({
        type: 'PacketSniffed',
        roomCode: 'CYBER-7X9',
        playerId: '11111111-1111-4111-8111-111111111111',
        card: { id: 'c1', protocol: 'Alpha' },
      });
      useGameStore.getState().applyCapacitorDischarged({
        type: 'CapacitorDischarged',
        roomCode: 'CYBER-7X9',
        playerId: '11111111-1111-4111-8111-111111111111',
        roll: 6,
        riskLevel: 1,
        resultingRiskLevel: 2,
        overloaded: false,
      });

      expect(useGameStore.getState().sniffedCard?.protocol).toBe('Alpha');
      expect(useGameStore.getState().lastDischargeOutcome?.roll).toBe(6);

      // EmpFlare clears sniffedCard and sets tablePileCount to 0
      useGameStore.getState().applyExploitTriggered({
        type: 'ExploitTriggered',
        roomCode: 'CYBER-7X9',
        playerId: '11111111-1111-4111-8111-111111111111',
        exploit: 'EmpFlare',
        newTargetProtocol: 'Beta',
      });
      expect(useGameStore.getState().sniffedCard).toBeNull();
      expect(useGameStore.getState().tablePileCount).toBe(0);

      // Starting next VoltageTest clears previous discharge outcome
      useGameStore.getState().applyVoltageTestStarted({
        type: 'VoltageTestStarted',
        roomCode: 'CYBER-7X9',
        pendingPlayerId: '22222222-2222-4222-8222-222222222222',
        decisionDeadlineUtc: null,
      });
      expect(useGameStore.getState().lastDischargeOutcome).toBeNull();
    });

    it('maintains dischargeCinematic through room snapshots until explicitly cleared', () => {
      useGameStore.getState().applyCapacitorDischarged({
        type: 'CapacitorDischarged',
        sequenceNumber: 42,
        roomCode: 'CYBER-7X9',
        playerId: '11111111-1111-4111-8111-111111111111',
        roll: 1,
        riskLevel: 3,
        resultingRiskLevel: 3,
        overloaded: true,
      });

      const cinematic = useGameStore.getState().dischargeCinematic;
      expect(cinematic).not.toBeNull();
      expect(cinematic?.event.roll).toBe(1);
      expect(cinematic?.event.overloaded).toBe(true);
      expect(typeof cinematic?.startedAtMs).toBe('number');

      // Room snapshots (TurnActive or VoltageTest) must NOT interrupt the 3D cinematic sequence
      useGameStore.getState().applyRoomSnapshot({
        roomCode: 'CYBER-7X9',
        state: 'TurnActive',
        hostId: '11111111-1111-4111-8111-111111111111',
        myPlayerId: '11111111-1111-4111-8111-111111111111',
        roundNumber: 2,
        currentTurnPlayerId: '22222222-2222-4222-8222-222222222222',
        currentTargetProtocol: 'Beta',
        tablePileCount: 0,
        myHand: [],
        seats: [],
      });

      expect(useGameStore.getState().dischargeCinematic).not.toBeNull();
      expect(useGameStore.getState().dischargeCinematic?.event.roll).toBe(1);

      // Duplicate sequenceNumber is ignored
      useGameStore.getState().applyCapacitorDischarged({
        type: 'CapacitorDischarged',
        sequenceNumber: 42,
        roomCode: 'CYBER-7X9',
        playerId: '11111111-1111-4111-8111-111111111111',
        roll: 1,
        riskLevel: 3,
        resultingRiskLevel: 3,
        overloaded: true,
      });
      expect(useGameStore.getState().dischargeCinematic?.startedAtMs).toBe(cinematic?.startedAtMs);

      // Explicit clear removes cinematic
      useGameStore.getState().clearDischargeCinematic();
      expect(useGameStore.getState().dischargeCinematic).toBeNull();
    });
  });
});

