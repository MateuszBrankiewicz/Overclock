// Phase 4 acceptance load test: concurrent rooms of bots playing full matches over SignalR.
//
// Usage (backend must be reachable directly, not through Nginx — see "Rate limits" below):
//
//   k6 run tests/load/game-loop-stress.js
//   k6 run -e BASE_URL=http://localhost:5000 -e ROOMS=50 -e PLAYERS_PER_ROOM=4 -e DURATION=5m \
//          tests/load/game-loop-stress.js
//
// Against the production stack, publish the backend port with the override file:
//
//   docker compose -f docker-compose.prod.yml -f tests/load/docker-compose.load.yml up -d --build
//   docker stats            # watch the backend container stay under 450 MB during the run
//
// Rate limits: room creation is capped at 5/min per client IP, so 50 rooms from one load
// generator only fit when each virtual player presents its own X-Forwarded-For address. The
// backend honours that header on direct connections; Nginx overwrites it with the real peer
// address, which is why the test must bypass the proxy.
//
// Success criteria (roadmap, Phase 4): p99 hub invocation latency < 80 ms, no hub errors.

import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';
import ws from 'k6/ws';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const ROOMS = Number(__ENV.ROOMS || 50);
const PLAYERS_PER_ROOM = Number(__ENV.PLAYERS_PER_ROOM || 4);
const DURATION_S = parseDurationSeconds(__ENV.DURATION || '5m');
const STAGGER_MS = Number(__ENV.STAGGER_MS || 100);
const THINK_MIN_MS = Number(__ENV.THINK_MIN_MS || 400);
const THINK_MAX_MS = Number(__ENV.THINK_MAX_MS || 1500);
const TRACE_PROBABILITY = Number(__ENV.TRACE_PROBABILITY || 0.3);
const SPOOF_CLIENT_IP = (__ENV.SPOOF_CLIENT_IP || 'true') !== 'false';

const VUS = ROOMS * PLAYERS_PER_ROOM;
const RAMP_S = Math.ceil((VUS * STAGGER_MS) / 1000);
const RECORD_SEPARATOR = '\x1e';
const KEEP_ALIVE_MS = 10000;
const TICK_MS = 1000;
const JOIN_RETRY_MS = 1000;
const MAX_JOIN_ATTEMPTS = 30;
const START_WITHOUT_FULL_ROOM_MS = 30000;
const REMATCH_DELAY_MS = 3000;

const invocationLatency = new Trend('signalr_invocation_latency', true);
const hubErrors = new Rate('signalr_hub_errors');
const sessionsConnected = new Rate('signalr_sessions_connected');
const actionsRejected = new Counter('game_actions_rejected');
const eventsReceived = new Counter('signalr_events_received');
const roomsReady = new Counter('rooms_started');
const matchesFinished = new Counter('matches_finished');

export const options = {
  scenarios: {
    rooms: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: `${DURATION_S + RAMP_S + 60}s`,
    },
  },
  thresholds: {
    signalr_invocation_latency: ['p(99)<80'],
    signalr_hub_errors: ['rate<0.01'],
    signalr_sessions_connected: ['rate>0.99'],
    rooms_started: [`count>=${ROOMS}`],
    matches_finished: ['count>0'],
  },
};

export function setup() {
  return { runId: Date.now().toString(36).toUpperCase() };
}

export default function (data) {
  const vuIndex = exec.vu.idInTest - 1;
  const roomIndex = Math.floor(vuIndex / PLAYERS_PER_ROOM);
  const seatIndex = vuIndex % PLAYERS_PER_ROOM;
  const roomCode = `LD-${data.runId}-${roomIndex}`;
  const nickname = `Bot${roomIndex}x${seatIndex}`;
  const isHost = seatIndex === 0;

  // Hosts connect before their guests because VU ids are sequential within a room.
  sleep((vuIndex * STAGGER_MS) / 1000);

  const params = SPOOF_CLIENT_IP ? { headers: { 'X-Forwarded-For': fakeClientIp(vuIndex) } } : {};
  const url = `${BASE_URL.replace(/^http/, 'ws')}/hubs/game`;

  const response = ws.connect(url, params, (socket) => {
    const bot = {
      playerId: null,
      snapshot: null,
      version: 0,
      actedVersion: -1,
      noTraceVersion: -1,
      inFlight: false,
      mustDischarge: false,
      joinedAt: 0,
      joinAttempts: 0,
      nextInvocationId: 0,
      pending: {},
    };

    const send = (message) => socket.send(JSON.stringify(message) + RECORD_SEPARATOR);

    const invoke = (target, argument, onDone) => {
      const invocationId = String(++bot.nextInvocationId);
      bot.pending[invocationId] = { startedAt: Date.now(), onDone };
      send({ type: 1, invocationId, target, arguments: [argument] });
    };

    // Runs one game action; a rejected action is retried on a later tick from fresh state.
    const act = (target, argument, onRejected) => {
      bot.inFlight = true;
      const version = bot.version;
      invoke(target, argument, (ok) => {
        bot.inFlight = false;
        if (ok) {
          bot.actedVersion = version;
          decide();
        } else {
          // No immediate retry: the next tick re-evaluates, which keeps a rejected action
          // from spinning into a request storm.
          actionsRejected.add(1, { target });
          if (onRejected) onRejected();
        }
      });
    };

    const think = (action, delayMs) => {
      bot.inFlight = true;
      socket.setTimeout(() => {
        bot.inFlight = false;
        action();
      }, delayMs === undefined ? randomBetween(THINK_MIN_MS, THINK_MAX_MS) : delayMs);
    };

    const applySnapshot = (snapshot) => {
      const previousState = bot.snapshot ? bot.snapshot.state : null;
      bot.snapshot = snapshot;
      bot.version++;
      if (snapshot.state === 'VoltageTest') {
        bot.mustDischarge = snapshot.pendingDischargePlayerId === bot.playerId;
      } else if (snapshot.state !== 'BluffCheck') {
        bot.mustDischarge = false;
      }
      // The host seat migrates when the creator is eliminated, so read it from the snapshot.
      if (snapshot.hostId === bot.playerId && previousState !== snapshot.state) {
        if (snapshot.state === 'GameOver') matchesFinished.add(1);
        if (previousState === 'Lobby' && snapshot.state !== 'Lobby') roomsReady.add(1);
      }
    };

    const playTurn = () => {
      const snapshot = bot.snapshot;
      if (snapshot.state !== 'TurnActive' || snapshot.currentTurnPlayerId !== bot.playerId) return;
      const hand = snapshot.myHand || [];
      const canTrace = snapshot.tablePileCount > 0 && bot.noTraceVersion !== bot.version;
      if (canTrace && (hand.length === 0 || Math.random() < TRACE_PROBABILITY)) {
        act('CallTrace', { roomCode }, () => {
          bot.noTraceVersion = bot.version;
        });
      } else if (hand.length > 0) {
        const count = 1 + Math.floor(Math.random() * Math.min(3, hand.length));
        const cardIds = shuffled(hand)
          .slice(0, count)
          .map((card) => card.id);
        act('PlayCards', { roomCode, cardIds, declaredProtocol: snapshot.currentTargetProtocol });
      } else {
        // Nothing playable: the server-side turn timer resolves the turn.
        bot.actedVersion = bot.version;
      }
    };

    function decide() {
      const snapshot = bot.snapshot;
      if (!snapshot || bot.inFlight) return;

      if (bot.mustDischarge) {
        think(() => {
          if (bot.mustDischarge) act('TriggerDischarge', { roomCode });
        });
        return;
      }

      if (bot.actedVersion === bot.version) return;

      if (snapshot.state === 'Lobby') {
        const mySeat = snapshot.seats.find((seat) => seat.playerId === bot.playerId);
        if (mySeat && !mySeat.isReady) {
          act('SetReady', { roomCode, isReady: true });
          return;
        }
        if (snapshot.hostId !== bot.playerId || !snapshot.seats.every((seat) => seat.isReady)) return;
        const roomIsFull = snapshot.seats.length >= PLAYERS_PER_ROOM;
        const waitedLongEnough =
          snapshot.seats.length >= 2 && Date.now() - bot.joinedAt > START_WITHOUT_FULL_ROOM_MS;
        if (roomIsFull || waitedLongEnough) act('StartRound', { roomCode });
      } else if (snapshot.state === 'TurnActive') {
        if (snapshot.currentTurnPlayerId === bot.playerId) think(playTurn);
      } else if (snapshot.state === 'GameOver' && snapshot.hostId === bot.playerId) {
        think(() => {
          const latest = bot.snapshot;
          if (latest.state === 'GameOver' && latest.hostId === bot.playerId) {
            act('StartRound', { roomCode });
          }
        }, REMATCH_DELAY_MS);
      }
    }

    const onEntered = (ok, result) => {
      if (!ok) return false;
      bot.playerId = result.data.playerId;
      bot.joinedAt = Date.now();
      applySnapshot(result.data.gameState);
      decide();
      return true;
    };

    const joinRoom = () => {
      bot.joinAttempts++;
      invoke('JoinRoom', { roomCode, nickname }, (ok, result) => {
        if (onEntered(ok, result)) return;
        actionsRejected.add(1, { target: 'JoinRoom' });
        if (bot.joinAttempts < MAX_JOIN_ATTEMPTS) socket.setTimeout(joinRoom, JOIN_RETRY_MS);
        else socket.close();
      });
    };

    const enterRoom = () => {
      if (!isHost) {
        joinRoom();
        return;
      }
      invoke('CreateRoom', { hostNickname: nickname, roomCode }, (ok, result) => {
        if (onEntered(ok, result)) return;
        actionsRejected.add(1, { target: 'CreateRoom' });
        socket.close();
      });
    };

    const onCompletion = (message) => {
      const pending = bot.pending[message.invocationId];
      if (!pending) return;
      delete bot.pending[message.invocationId];
      invocationLatency.add(Date.now() - pending.startedAt);
      hubErrors.add(Boolean(message.error));
      const result = message.result;
      pending.onDone(!message.error && Boolean(result) && result.isSuccess === true, result);
    };

    const onServerInvocation = (message) => {
      eventsReceived.add(1);
      const payload = (message.arguments || [])[0];
      if (!payload) return;
      if (message.target === 'ReceiveGameState') {
        applySnapshot(payload);
        decide();
      } else if (message.target === 'TraceCalled') {
        if (payload.loserPlayerId === bot.playerId) {
          bot.mustDischarge = true;
          decide();
        }
      } else if (message.target === 'CapacitorDischarged') {
        if (payload.playerId === bot.playerId) bot.mustDischarge = false;
      }
    };

    let handshakeDone = false;

    socket.on('open', () => {
      send({ protocol: 'json', version: 1 });
      socket.setInterval(() => send({ type: 6 }), KEEP_ALIVE_MS);
      socket.setInterval(decide, TICK_MS);
      socket.setTimeout(() => socket.close(), DURATION_S * 1000);
    });

    socket.on('message', (raw) => {
      const frames = String(raw).split(RECORD_SEPARATOR);
      for (const frame of frames) {
        if (!frame) continue;
        const message = JSON.parse(frame);
        if (!handshakeDone) {
          handshakeDone = true;
          if (message.error) {
            hubErrors.add(true);
            socket.close();
            return;
          }
          enterRoom();
        } else if (message.type === 1) {
          onServerInvocation(message);
        } else if (message.type === 3) {
          onCompletion(message);
        } else if (message.type === 7) {
          socket.close();
          return;
        }
      }
    });

    socket.on('error', () => hubErrors.add(true));
  });

  const connected = check(response, {
    'websocket upgraded (101)': (res) => Boolean(res) && res.status === 101,
  });
  sessionsConnected.add(connected);
}

function parseDurationSeconds(text) {
  const match = /^(\d+)(s|m|h)?$/.exec(String(text).trim());
  if (!match) throw new Error(`Invalid DURATION '${text}' (use e.g. 90s, 5m, 1h).`);
  const unit = { s: 1, m: 60, h: 3600 }[match[2] || 's'];
  return Number(match[1]) * unit;
}

function fakeClientIp(vuIndex) {
  const n = vuIndex + 1;
  return `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;
}

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * Math.max(1, max - min));
}

function shuffled(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
