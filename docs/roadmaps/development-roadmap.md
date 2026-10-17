# Implementation Roadmap: Project Overclock (*Dead Circuit*)

This document defines the operational, chronological implementation plan for the web multiplayer game **Project: Overclock** (*Dead Circuit*).
Each task specifies its repository location, precise technical scope, and acceptance criteria.

---

## Table of Contents
1. [Execution Standards & Workflow](#execution-standards--workflow)
2. [Phase 0: Core Loop in Minimal UI (Headless & Networking Core)](#phase-0-core-loop-in-minimal-ui-headless--networking-core)
3. [Phase 1: PCB Card Component & Operating Table (Visual Core & Action Queue)](#phase-1-pcb-card-component--operating-table-visual-core--action-queue)
4. [Phase 2: Voltage & Execution Mechanics (Overvoltage Shunt & Hardware Exploits)](#phase-2-voltage--execution-mechanics-overvoltage-shunt--hardware-exploits)
5. [Phase 3: Audio, Diegetic FX & Polish (Atmosphere & Sensory Feedback)](#phase-3-audio-diegetic-fx--polish-atmosphere--sensory-feedback)
6. [Phase 4: Scalability, Deployment & Go-To-Market (Production Release)](#phase-4-scalability-deployment--go-to-market-production-release)
7. [Dependency Matrix & Implementation Order](#dependency-matrix--implementation-order)

---

## Execution Standards & Workflow

Every task in this roadmap must adhere to the rules defined in `AGENTS.md`:
1. **Zero business logic outside Domain / CQRS:** API controllers and SignalR hubs dispatch requests strictly through `ISender.Send`.
2. **Zero type assertions on frontend:** SignalR events are validated at runtime via Zod (`safeParse`).
3. **State masking (Anti-Cheat):** The server never transmits opponents' hands or face-down table cards.
4. **Change verification:** Before committing any step, run `bash scripts/verify.sh --fast`.

---

## Phase 0: Core Loop in Minimal UI (Headless & Networking Core)

### Phase Goal (Definition of Done)
A functional, authoritative game loop for 2–4 players running in a raw test interface (Debug Terminal). Players create a room, synchronize readiness, receive cards (scaled per balance table), play turns within a 15-second timer limit, and call `TRACE`. The server resolves bluffs, governs state via a single-writer channel loop, and supports reconnections within a 30-second window after socket disconnection.

### Task Breakdown

#### [Backend .NET]
- [x] **`TASK-0.1` | Card & Deck Domain Model**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Domain/`
  - **Scope:**
    - Define `CardProtocol` enums/records (`Alpha`, `Beta`, `Gamma`, `Glitch`, `Corrupted`).
    - Implement `Card` entity with unique `CardId` and properties `IsWildcard` / `IsForcedBluff`.
    - Implement `Deck` aggregate with scaling (2 players: 14 cards, 3 players: 18 cards, 4 players: 22 cards).
    - Fisher-Yates shuffle algorithm powered by `System.Security.Cryptography.RandomNumberGenerator`.
    - Partition out the hidden `BurnedPile` from active dealable cards.
  - **Verification:** Unit tests verifying card type proportions for 2, 3, and 4 players.

- [x] **`TASK-0.2` | GameRoom Aggregate & State Machine**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Domain/`
  - **Scope:**
    - `PlayerSeat` entity: `PlayerId`, `ConnectionId`, `SessionToken`, `List<Card> Hand`, `PlayerStatus` (`Active`, `Disconnected`, `Eliminated`).
    - `GameRoom` aggregate: states `Lobby`, `Dealing`, `TurnActive`, `BluffCheck`, `RoundOver`, `GameOver`.
    - Domain methods: `AddPlayer`, `SetReady`, `StartRound`, `PlayCards`, `CallTrace`, `HandleDisconnect`, `HandleReconnect`.
    - Validation guard: ensure player holds the declared `CardId`s in their hand.
  - **Verification:** State machine transition unit tests in `GameEngine.Domain.Tests`.

- [ ] **`TASK-0.3` | Single-Writer Channel Loop**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Application/Rooms/`
  - **Scope:**
    - Create `RoomManager` storing active room instances in RAM.
    - Implement `System.Threading.Channels.Channel<GameAction>` queue for each active room.
    - Consumer background loop executing actions sequentially on a single thread, eliminating locks.
  - **Verification:** Concurrently submit 100 actions to a room; assert absence of race conditions and strict FIFO ordering.

- [ ] **`TASK-0.4` | Turn Timer Engine**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Application/Services/`
  - **Scope:**
    - Manage turn duration with `CancellationTokenSource` and `TurnSequenceId`.
    - 15-second countdown per move.
    - On timeout: auto-generate `TurnExpired` action and transition to penalty resolution.
  - **Verification:** Unit test asserting timeout automatically passes turn and applies penalty.

- [ ] **`TASK-0.5` | Anti-Cheat State Projection Engine**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Application/Projections/`
  - **Scope:**
    - Transform `GameRoom` aggregate state into player-specific DTOs (`PlayerGameStateDto`).
    - Recipient sees their own cards in plaintext (`Id`, `Protocol`).
    - Opponents' hands are masked — only card count (`HandCount`) is exposed.
    - Table pile only exposes total size (`TablePileCount`) without revealing played card types.
  - **Verification:** Unit test assertion: opponent DTO contains zero IDs or types of foreign cards.

- [ ] **`TASK-0.6` | SignalR Hub & Reconnection Handling**
  - **Location:** `backend/src/Host/Overclock.Host/Hubs/GameHub.cs`
  - **Scope:**
    - Hub methods: `CreateRoom`, `JoinRoom`, `SetReady`, `PlayCards`, `CallTrace`, `Reconnect`.
    - Issue `SessionToken` (UUIDv4) returned to player upon joining.
    - `OnDisconnectedAsync`: mark player as `Disconnected`, start 30s grace timer.
    - `Reconnect`: validate `SessionToken`, rebind new `ConnectionId`, and immediately transmit full state snapshot.
  - **Verification:** Integration test simulating client disconnect and reconnect preserving state.

#### [Frontend React]
- [ ] **`TASK-0.7` | Zod Validation Schemas for SignalR**
  - **Location:** `frontend/src/features/game/schemas/gameEvents.ts`
  - **Scope:**
    - Zod schemas: `RoomStateSnapshotSchema`, `CardsPlayedEventSchema`, `TraceCalledEventSchema`, `RoundStartedEventSchema`, `PlayerStatusChangedEventSchema`.
    - Export inferred TypeScript types (`z.infer<typeof ...>`).
  - **Verification:** Vitest tests parsing JSON fixtures in `tests/contracts/signalr/`.

- [ ] **`TASK-0.8` | SignalR Connection Manager**
  - **Location:** `frontend/src/shared/realtime/gameConnection.ts`
  - **Scope:**
    - Initialize `@microsoft/signalr` with `withAutomaticReconnect`.
    - Store `SessionToken` and `RoomId` in `sessionStorage`.
    - Validate every incoming payload via `safeParse` — reject malformed packets and log contract errors.
  - **Verification:** Vitest test: malformed JSON does not crash client and is safely rejected by Zod.

- [ ] **`TASK-0.9` | Ephemeral Game Store (Zustand)**
  - **Location:** `frontend/src/features/game/stores/useGameStore.ts`
  - **Scope:**
    - Slices: `roomSlice` (room status, players), `handSlice` (my cards, selection), `turnSlice` (active player, remaining time).
    - Actions updating state from parsed SignalR events.
  - **Verification:** Vitest reducer tests verifying valid state transitions upon network events.

- [ ] **`TASK-0.10` | Headless Debug Terminal UI**
  - **Location:** `frontend/src/features/game/components/DebugTerminal.tsx`
  - **Scope:**
    - Raw retro-text interface for multi-tab manual testing.
    - Live JSON display of room state.
    - Action buttons: `[Create Room]`, `[Join]`, `[Ready]`, `[Play Cards]`, `[Call TRACE]`, `[Simulate Disconnect]`.
  - **Verification:** Manually play through a full match across 3 incognito browser tabs.

#### [Protocol / DTO]
- [ ] **`TASK-0.11` | C# Contracts & JSON Fixtures**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Contracts/` and `tests/contracts/signalr/`
  - **Scope:**
    - Define C# records: `PlayCardsCommand`, `CallTraceCommand`, `ReconnectCommand`, `GameStateSnapshotDto`.
    - Persist reference JSON files in `tests/contracts/signalr/` for contract testing.
  - **Verification:** Integration test asserting C# serialization matches JSON fixtures.

### Critical Engineering Pitfalls
- ❌ **Do not build styled UI components yet:** Animations, styling, and graphics at this stage distract from state machine integrity.
- ❌ **Never send opponent cards to the client:** The client must never hold face-down table cards or opponent hand cards in memory.
- ❌ **Do not use `lock` in async C# code:** Always use `System.Threading.Channels.Channel`.

### Measurable Phase 0 Acceptance Test
```bash
# Run backend architecture and integration tests
dotnet test backend/tests/Integration.Tests/ --filter "FullyQualifiedName~HeadlessGameLoopTests"
# Run frontend contract schema tests
cd frontend && npm run test:contracts
```
- **Success Criteria:**
  1. Three virtual players connect to a room, pass the deal phase, and play 3 full turns.
  2. Player A simulates connection loss (socket closure), reconnects within 15s with valid session token, and restores their hand.
  3. Client B inspects network devtools — zero information about Player A's card types is leaked.

---

## Phase 1: PCB Card Component & Operating Table (Visual Core & Action Queue)

### Phase Goal (Definition of Done)
A fully responsive 2D/2.5D operating table featuring a diegetic Printed Circuit Board (PCB) aesthetic. Players can select 1–3 cards, play them onto the table with a flight animation, and observe the `TRACE` reveal sequence with 3D card flips. An `ActionQueue` in Zustand ensures rapid network events do not cause animation skipping or teleportation.

### Task Breakdown

#### [Backend .NET]
- [ ] **`TASK-1.1` | Deterministic Visual Card Seed**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Application/`
  - **Scope:**
    - Compute `VisualSeed` (int) for each card based on `CardId` hash.
    - Include `VisualSeed` in card DTOs so frontend generates identical PCB trace layouts without downloading textures.
  - **Verification:** Unit test: identical `CardId` always produces identical `VisualSeed`.

#### [Frontend React]
- [ ] **`TASK-1.2` | FIFO Action Queue Manager (ActionQueue)**
  - **Location:** `frontend/src/features/game/stores/useActionQueue.ts`
  - **Scope:**
    - FIFO buffer storing SignalR events: `{ id, type, payload, minDurationMs }`.
    - Block next action until current animation emits `onAnimationComplete()`.
    - Fallback timeout (2000ms) forcing progression if an animation hangs.
  - **Verification:** Vitest test: 3 events arriving within 10ms are executed sequentially with minimum 300ms separation.

- [ ] **`TASK-1.3` | Vector PCB Card Component (`<PcbCard />`)**
  - **Location:** `frontend/src/features/game/components/PcbCard.tsx`
  - **Scope:**
    - Pure SVG/Tailwind rendering PCB substrate:
      - `Alpha`: emerald soldermask, ENIG gold traces.
      - `Beta`: amber soldermask, copper traces.
      - `Gamma`: cyan soldermask, silver pads.
      - `Glitch`: purple substrate with artifacting and "OVERRIDE" token.
      - `Corrupted`: matte black, severed traces, burnt pads.
    - Card back: diegetic power circuit & microcontroller schematic.
    - States: `selected`, `disabled`, `hovered`, `faceDown`.
  - **Verification:** Storybook / component tests rendering soldermask variants and card backs.

- [ ] **`TASK-1.4` | Table Animations with Framer Motion**
  - **Location:** `frontend/src/features/game/components/OperatingTable.tsx`
  - **Scope:**
    - Smooth card flight from hand to center table with dynamic rotation (-5° to +5°) and substrate shadow.
    - Opponent seat representations with face-down card miniatures.
    - Center table pile component (`<TablePile />`).
  - **Verification:** Playwright test verifying card trajectory and layout transitions.

- [ ] **`TASK-1.5` | Cascading Card Reveal [TRACE] (3D Flip)**
  - **Location:** `frontend/src/features/game/components/CardRevealSequence.tsx`
  - **Scope:**
    - CSS 3D Transforms (`rotateY: 180deg`, `transform-style: preserve-3d`).
    - Staggered card flip (150ms per card from last played packet).
    - Visual bluff resolution highlight (red pulse for bluff detected, green pulse for truth).
  - **Verification:** Assertion on animation completion and event emission to `ActionQueue`.

#### [Protocol / DTO]
- [ ] **`TASK-1.6` | Sequence Signature Extension for Events**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Contracts/`
  - **Scope:**
    - Add `SequenceNumber` to all gameplay events for client-side continuity checks.
    - Update Zod schemas on frontend.
  - **Verification:** Event deserialization unit tests with new field.

### Critical Engineering Pitfalls
- ❌ **Do not introduce Three.js / Canvas 3D:** Standard CSS 3D transforms and inline SVG vectors are lightweight, responsive, and mobile-friendly.
- ❌ **Never modify state without FIFO queue:** Assigning `TraceCalled` directly to store skips and breaks in-flight play animations.

### Measurable Phase 1 Acceptance Test
- **E2E Scenario (Playwright):**
  1. Player A selects 2 cards in hand and clicks `[TRANSMIT]`.
  2. Cards animate onto center table over 350ms.
  3. Player B immediately clicks `[TRACE]`.
  4. Both browsers display cascading 3D card flips (150ms stagger).
  5. Entire sequence maintains 60 FPS without stutter or element teleportation.

---

## Phase 2: Voltage & Execution Mechanics (Overvoltage Shunt & Hardware Exploits)

### Phase Goal (Definition of Done)
Full risk and elimination mechanics. A failed bluff triggers an authoritative capacitor test (1–6). A short-circuit eliminates the player (*Blackout*), transitioning them to Spectator mode. Each player holds 1 random hardware exploit (*Packet Sniffer*, *Ground Wire*, *Overclock Injector*, *EMP Flare*), usable only during its designated *Timing Window*. Used modules burn out permanently.

### Task Breakdown

#### [Backend .NET]
- [ ] **`TASK-2.1` | Capacitor Discharge Engine (CapacitorDischargeEngine)**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Domain/Services/`
  - **Scope:**
    - Track risk level per player seat (initial: 1/6).
    - Increase risk by +1 after each survived test (max 6/6).
    - Roll roll (1–6) via `RandomNumberGenerator.GetInt32(1, 7)`.
    - If `Roll <= RiskLevel` -> short circuit (`Overload = true`).
  - **Verification:** Statistical test over 10,000 iterations verifying probability distribution.

- [ ] **`TASK-2.2` | Hardware Exploits**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Domain/Exploits/`
  - **Scope:**
    - Assign 1 random module at match start: `PacketSniffer`, `GroundWire`, `OverclockInjector`, `EmpFlare`.
    - `TimingWindowValidator`:
      - `Pre-Action`: `PacketSniffer`, `EmpFlare`.
      - `Pre-Discharge`: `GroundWire` (reduces current risk by 50%).
      - `Interrupt`: `OverclockInjector` (reduces opponent turn timer to 5s).
    - Permanent burnout: set `IsBurned = true`.
    - `PacketSniffer` logic: server transmits preview of 1 random card exclusively to the exploiting player.
    - `EmpFlare` logic: destroy table pile, reset lead protocol, initiate new turn.
  - **Verification:** Domain unit tests for module activations and rejecting out-of-window requests.

- [ ] **`TASK-2.3` | Elimination & Match Resolution**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Domain/`
  - **Scope:**
    - Transition player to `Eliminated` upon capacitor overload.
    - Reject any further gameplay actions from eliminated players.
    - Active player count check: if 1 player remains -> transition to `GameOver` and publish `MatchFinishedEvent`.
  - **Verification:** Unit test simulating elimination of 3 out of 4 players ending the match.

#### [Frontend React]
- [ ] **`TASK-2.4` | Capacitor Meter (`<CapacitorMeter />`)**
  - **Location:** `frontend/src/features/game/components/CapacitorMeter.tsx`
  - **Scope:**
    - Diegetic voltage meter / LED bar (1/6 to 6/6).
    - Needle jitter (CSS micro-jitter) intensifying with higher risk.
  - **Verification:** Component test covering risk levels 1 through 6.

- [ ] **`TASK-2.5` | Hardware Exploit Slot (`<ExploitChipSlot />`)**
  - **Location:** `frontend/src/features/game/components/ExploitChipSlot.tsx`
  - **Scope:**
    - Physical DIP-8 IC component with status LED.
    - Button glow and interactivity active only during eligible timing window.
    - Burnout effect: cracked texture, extinguished LED, and smoke on use.
  - **Verification:** Interaction test: clicking in Pre-Action window triggers activation; clicking after burnout is disabled.

- [ ] **`TASK-2.6` | Voltage Test Modal (`<VoltageTestSequence />`)**
  - **Location:** `frontend/src/features/game/components/VoltageTestSequence.tsx`
  - **Scope:**
    - Voltage modal: bus charging animation.
    - Safe outcome: green flash, gauge resets to normal.
    - Overload outcome: blue electrical arc strike, terminal blackout, spectator overlay activation (*SPECTATOR MODE*).
  - **Verification:** Visual test for both discharge resolution paths.

#### [Protocol / DTO]
- [ ] **`TASK-2.7` | Exploit & Voltage DTOs / Events**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Contracts/`
  - **Scope:**
    - `ActivateExploitCommand(Guid RoomId, ExploitType Exploit)`.
    - `ExploitTriggeredEvent(Guid PlayerId, ExploitType Exploit)`.
    - `CapacitorDischargedEvent(Guid PlayerId, int Roll, int RiskLevel, bool Overloaded)`.
    - `PlayerEliminatedEvent(Guid PlayerId, int Placement)`.
  - **Verification:** Zod schema validation and updates.

### Critical Engineering Pitfalls
- ❌ **Do not roll dice on the frontend:** All random calculations must originate from server CSPRNG.
- ❌ **Do not broadcast Packet Sniffer card data:** Inspected card info must be sent exclusively to the invoking player.

### Measurable Phase 2 Acceptance Test
- **Integration Scenario:**
  1. Player A loses bluff at risk level 2/6.
  2. Player A uses `Ground Wire` in Pre-Discharge window -> server reduces risk to 1/6.
  3. Server executes roll. Result = 1.
  4. Server broadcasts `CapacitorDischargedEvent(Overloaded = true)`, then `PlayerEliminatedEvent(Player A)`.
  5. Player A terminal switches to locked spectator mode; match continues seamlessly among survivors.

---

## Phase 3: Audio, Diegetic FX & Polish (Atmosphere & Sensory Feedback)

### Phase Goal (Definition of Done)
Implementation of the full lo-fi cyberpunk audiovisual experience without performance degradation (rock-solid 60 FPS). Integrated Web Audio API sound synthesizer reproduces low-latency relay clicks, electric arcs, and escalating capacitor whine. Interface is enhanced with a diegetic CRT monitor overlay (scanlines, vignette, phosphor glow, chromatic aberration on bluffs).

### Task Breakdown

#### [Backend .NET]
- [ ] **`TASK-3.1` | Voltage Metadata & Audio Tension Signatures**
  - **Location:** `backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Application/`
  - **Scope:**
    - Include `TensionLevel` (1–10) in room snapshots, computed from table pile size and capacitor risks.
    - Synchronize `ServerTimeUtc` timestamp to align audio beats across clients.
  - **Verification:** Unit test for `TensionLevel` computation.

#### [Frontend React]
- [ ] **`TASK-3.2` | Web Audio API Sound Engine**
  - **Location:** `frontend/src/shared/lib/audio/SoundManager.ts`
  - **Scope:**
    - Initialize `AudioContext` with in-memory sample caching (`AudioBuffer`).
    - Procedural synthesis of capacitor hum using `OscillatorNode` (smooth frequency sweep 60 Hz -> 4 kHz).
    - Sound triggers: relay click (`RELAY_CLICK`), toggle switch (`SWITCH_TOGGLE`), verification alarm (`TRACE_ALARM`), discharge snap (`DISCHARGE_SNAP`).
  - **Verification:** Unit test asserting sound triggers with mocked `AudioContext`.

- [ ] **`TASK-3.3` | Diegetic Boot Screen (Audio Unlock Prompt)**
  - **Location:** `frontend/src/features/game/components/SystemBootModal.tsx`
  - **Scope:**
    - Terminal initialization modal (`[INITIALIZE SYSTEM AUDIO]`) satisfying browser *User Gesture Policy*.
    - Transition `AudioContext.state` from `suspended` to `running` upon user gesture.
  - **Verification:** Verification in Chrome/Firefox incognito mode.

- [ ] **`TASK-3.4` | CRT Monitor Container (`<CrtContainer />`)**
  - **Location:** `frontend/src/shared/components/CrtContainer.tsx`
  - **Scope:**
    - CSS scanlines with subtle flicker (GPU-accelerated via `transform: translateZ(0)`).
    - Screen curvature vignette and rounded CRT bezel corners.
    - Text phosphor glow (`text-shadow: 0 0 8px rgba(34, 197, 94, 0.6)`).
  - **Verification:** Visual inspection confirming no moiré artifacts on HiDPI displays.

- [ ] **`TASK-3.5` | Glitch & Chromatic Aberration Overlays**
  - **Location:** `frontend/src/shared/components/GlitchOverlay.tsx`
  - **Scope:**
    - Dynamic RGB channel separation (chromatic aberration) upon `TRACE` declaration.
    - Physical screen shake on capacitor discharge impact.
  - **Verification:** Chrome DevTools performance profiling confirming 60 FPS during effect triggers.

- [ ] **`TASK-3.6` | 60 FPS Profiling & Optimization**
  - **Location:** `frontend/src/`
  - **Scope:**
    - Eliminate expensive `backdrop-filter: blur()`.
    - Apply `will-change: transform` to animated PCB elements.
  - **Verification:** Lighthouse Performance > 90 and solid 60 FPS during discharge sequences.

### Critical Engineering Pitfalls
- ❌ **Do not fire audio before user interaction:** Violating browser Autoplay policies crashes audio context.
- ❌ **Do not use uncompressed WAV files:** All audio samples must be compressed (OGG/WebM, < 50 KB) or procedurally synthesized.

### Measurable Phase 3 Acceptance Test
- **Performance & Audio Test:**
  1. Open page in clean incognito session -> clicking `[INITIALIZE SYSTEM]` unlocks audio without console warnings.
  2. Clicking card produces audible relay click in < 15ms.
  3. Overload event triggers simultaneous CRT flash, screen shake, and discharge snap.
  4. Frame profiler maintains minimum 58 FPS on integrated GPU devices.

---

## Phase 4: Scalability, Deployment & Go-To-Market (Production Release)

### Phase Goal (Definition of Done)
Production deployment stack launched via `docker compose up -d`. SignalR is horizontally scaled through a Redis Backplane with strict hierarchical key namespacing. Players join via direct room links (`/join/CYBER-7X9`). Includes Streamer Mode (protection against stream-sniping), asynchronous match stats persistence to PostgreSQL, and Rate Limiting.

### Task Breakdown

#### [Backend .NET]
- [ ] **`TASK-4.1` | Redis SignalR Backplane**
  - **Location:** `backend/src/Host/Overclock.Host/Program.cs`
  - **Scope:**
    - Configure `AddStackExchangeRedis` as SignalR backplane.
    - Key namespace convention: `overclock:game:room:{id}` and `overclock:game:lock:{id}`.
    - Store room metadata in Redis with explicit TTL (2 hours).
  - **Verification:** Testcontainers integration test: 2 backend instances relay events to players in the same room.

- [ ] **`TASK-4.2` | Rate Limiting & Resource Protection**
  - **Location:** `backend/src/Host/Overclock.Host/Program.cs`
  - **Scope:**
    - Configure `Microsoft.AspNetCore.RateLimiting`: room creation limit (max 5/min per IP) and SignalR actions (max 10 actions/second).
    - Protect against Denial of Service attempts.
  - **Verification:** Automated test firing 50 requests in 1 second — assert HTTP 429 response.

- [ ] **`TASK-4.3` | Async Match Stats Persistence (StatsModule)**
  - **Location:** `backend/src/Modules/Stats/Overclock.Modules.Stats.Application/`
  - **Scope:**
    - Subscribe to `MatchFinishedEvent`.
    - Asynchronously write match record (duration, round count, winner, burnt modules) to PostgreSQL.
    - Isolated `StatsDbContext` with `stats` schema.
  - **Verification:** Integration test verifying PostgreSQL row presence after match completion.

- [ ] **`TASK-4.4` | Health Checks & Monitoring**
  - **Location:** `backend/src/Host/Overclock.Host/Program.cs`
  - **Scope:**
    - Endpoints `/healthz` (liveness) and `/readyz` (readiness probing Redis and Postgres connectivity).
  - **Verification:** HTTP GET returning 200 OK inside container environment.

#### [Frontend React]
- [ ] **`TASK-4.5` | Dynamic Room Routing (`/join/:roomId`)**
  - **Location:** `frontend/src/app/routes/JoinRoomRoute.tsx`
  - **Scope:**
    - Direct invite link handler: player enters nickname and instantly joins lobby.
    - "Copy Room Link" button in lobby.
  - **Verification:** E2E test: opening URL in second browser window directly enters the lobby.

- [ ] **`TASK-4.6` | Streamer Safe Mode (Streamer Mode)**
  - **Location:** `frontend/src/features/game/components/StreamerSettings.tsx`
  - **Scope:**
    - Settings toggle: mask room code (`CYBER-***`).
    - "Hold to Reveal Cards" option: hand cards remain face down by default, revealed only while holding hotkey (e.g. Space).
  - **Verification:** Component test verifying masked cards in streamer mode.

- [ ] **`TASK-4.7` | Production Bundling & Nginx Proxy**
  - **Location:** `frontend/nginx.conf` and `frontend/vite.config.ts`
  - **Scope:**
    - Nginx configuration: static asset delivery, API/SignalR proxy with WebSocket `Upgrade` headers.
    - Brotli / Gzip compression.
  - **Verification:** Verify HTTP response headers and WebSocket upgrade via Nginx.

#### [Infrastructure & DevOps]
- [ ] **`TASK-4.8` | Production Docker Compose**
  - **Location:** `docker-compose.prod.yml`
  - **Scope:**
    - Containers: `backend` (.NET 10), `frontend` (Nginx), `redis` (Alpine), `postgres` (Alpine).
    - Configure persistent volumes, resource memory limits, and auto-restart (`restart: unless-stopped`).
  - **Verification:** Launch `docker compose -f docker-compose.prod.yml up -d` on clean Linux host.

### Critical Engineering Pitfalls
- ❌ **Do not write in-game moves to PostgreSQL:** Active match state lives exclusively in RAM and Redis. PostgreSQL only receives the post-match summary.
- ❌ **Never expose auth tokens in URLs:** Invite links contain only the public room identifier (`CYBER-7X9`).

### Measurable Phase 4 Acceptance Test
```bash
# Stress test room execution loops
k6 run tests/load/game-loop-stress.js
```
- **Success Criteria:**
  1. 50 concurrent rooms (200 virtual players) executing matches over 5 minutes.
  2. SignalR p99 latency remains under 80ms.
  3. Backend container memory stays under 450 MB RAM with zero memory leaks.
  4. Running `bash scripts/verify.sh` in CI exits with code 0.

---

## Dependency Matrix & Implementation Order

```mermaid
graph TD
    subgraph Phase 0
        T01["TASK-0.1: Deck & Cards"] --> T02["TASK-0.2: GameRoom Aggregate"]
        T02 --> T03["TASK-0.3: Single-Writer Loop"]
        T02 --> T04["TASK-0.4: Turn Timer"]
        T02 --> T05["TASK-0.5: State Projection Engine"]
        T03 & T05 --> T06["TASK-0.6: SignalR Hub"]
        T06 --> T07["TASK-0.7: Zod Schemas"]
        T07 --> T08["TASK-0.8: SignalR Client"]
        T08 --> T09["TASK-0.9: Zustand Store"]
        T09 --> T10["TASK-0.10: Debug Terminal"]
    end

    subgraph Phase 1
        T10 --> T11["TASK-1.1: Visual Seed"]
        T09 --> T12["TASK-1.2: ActionQueue FIFO"]
        T11 & T12 --> T13["TASK-1.3: PcbCard Component"]
        T13 --> T14["TASK-1.4: Table Animations"]
        T14 --> T15["TASK-1.5: Reveal Sequence TRACE"]
    end

    subgraph Phase 2
        T02 --> T21["TASK-2.1: Capacitor Engine"]
        T02 --> T22["TASK-2.2: Hardware Exploits"]
        T21 & T22 --> T23["TASK-2.3: Elimination Mechanics"]
        T21 --> T24["TASK-2.4: CapacitorMeter UI"]
        T22 --> T25["TASK-2.5: ExploitChipSlot UI"]
        T23 --> T26["TASK-2.6: VoltageTest Modal"]
    end

    subgraph Phase 3
        T15 & T26 --> T31["TASK-3.1: Voltage Metadata"]
        T31 --> T32["TASK-3.2: SoundManager Web Audio"]
        T32 --> T33["TASK-3.3: SystemBoot Prompt"]
        T14 --> T34["TASK-3.4: CrtContainer Overlay"]
        T34 --> T35["TASK-3.5: Glitch & Screen Shake"]
    end

    subgraph Phase 4
        T06 --> T41["TASK-4.1: Redis Backplane"]
        T06 --> T42["TASK-4.2: Rate Limiting"]
        T23 --> T43["TASK-4.3: Stats Persistence"]
        T08 --> T44["TASK-4.4: Routing /join/:roomId"]
        T14 --> T45["TASK-4.5: Streamer Mode"]
        T41 & T43 --> T46["TASK-4.6: Docker Compose Prod"]
    end
```
