# 14. Game Audio Engine on the Web Audio API

Date: 2026-11-12

## Status

Accepted

Amends [0002](0002-technology-stack-and-modular-monolith.md).

<!--
Allowed values (validated by scripts/check-docs.sh):
  Proposed | Accepted | Rejected | Deprecated | Superseded by [NNNN](NNNN-title.md)
Optional extra line: "Amends [NNNN](NNNN-title.md)".
-->

## Context and Problem Statement

The roadmap item U13 (`docs/roadmaps/frontend-ux-fix-plan.md`) asks for in-game audio: a background hum, card click, TRACE siren, a rising buzzer during the voltage test, a discharge crackle, and a mute button.

* [ADR 0002](0002-technology-stack-and-modular-monolith.md) (Frontend section) lists **Howler.js** for sound effects, and `docs/architecture/frontend-guidelines.md` shows a "Howler audio engine" under `shared/lib`. In reality `frontend/package.json` has **no** audio dependency and `shared/lib` contains only `haptics.ts` (the established pattern: a small dependency-free module with a Vitest test).
* [ADR 0010](0010-webgl-3d-bunker-arena-character-selection-and-mobile-first-viewport.md) deliberately avoids asset downloads (procedural geometry/textures) to keep load time and mobile GPU/RAM low; the audio design should follow the same philosophy.
* Browsers block audio until a user gesture (autoplay policy) and iOS Safari additionally suspends `AudioContext` on background/lock.
* A new third-party dependency requires an ADR ([AGENTS.md](../../AGENTS.md) §1.2). Choosing *not* to adopt Howler also contradicts the stack named in ADR 0002, so this record amends it.

## Decision Drivers

* **Zero or minimal bytes added to the bundle**, no blocking asset downloads before first interaction.
* **Procedural synthesis fits the content:** hum, siren, rising buzzer and crackle are oscillator/noise effects and can be generated, with parameters driven by game state (e.g. buzzer pitch from `riskLevel`).
* **Predictable latency** for card clicks on mobile.
* **Testability in JSDOM/Vitest** (no real audio device), as with the WebGL fallback in ADR 0010.
* **Respect user control and policy:** persisted mute, autoplay compliance, no sound while the tab is hidden.

## Considered Options

1. **Howler.js (+ pre-rendered sample files).**
   * *Pros:* mature autoplay/unlock handling, sprite support, fallbacks for old browsers.
   * *Cons:* new runtime dependency (~10 KB gz) and a set of encoded audio files (tens to hundreds of KB, plus licensing/authoring); the effects here are synthesizable so the library's main value (sample playback) is mostly unused; Howler falls back to HTML5 Audio, whose latency is worse on mobile.
2. **Web Audio API wrapper in `shared/lib/audio` (no dependency) with procedurally synthesized effects (Chosen).**
   * *Pros:* zero dependency and zero audio assets; effects parametrised by game state; same code path in all evergreen browsers (React 19 / WebGL baseline already excludes legacy ones).
   * *Cons:* we own the autoplay/unlock logic and the sound design code; synthesized sound may be less rich than recorded samples.
3. **Hybrid: Web Audio engine now, optional sample files later behind the same interface.** Covered by Option 2's interface; adopting samples later does not require Howler.

## Decision Outcome

Chosen Option: **Option 2**. No new npm package is added; the Howler reference in `frontend-guidelines.md` is to be replaced by "Web Audio engine" when this ADR is accepted.

### Design

* **Module:** `frontend/src/shared/lib/audio/` with `audioEngine.ts` (lazy singleton owning one `AudioContext`, a master `GainNode`, and `play(effect, params?)` / `startLoop(name)` / `stopLoop(name)`), `effects.ts` (pure builders for each effect from oscillators, noise buffers and envelopes), and `useAudioSettings` state. Components never touch `AudioContext`; game code calls it from the realtime event handlers next to `recordGameEvent` / `vibrate` in `useDebugTerminal.ts`.
* **Effects:** `hum` (looped low drone, started when a match is active), `cardClick`, `traceSiren` (swept oscillator), `voltageBuzz` (continuous, pitch/gain ramped from `riskLevel` and the decision deadline), `discharge` (noise burst + decay). Overall peak gain is limited via the master gain/compressor so effects cannot clip.
* **Autoplay policy:** the `AudioContext` is created lazily and `resume()`d from the first trusted user gesture (`pointerdown`/`keydown`) through a one-time listener; before that, `play` calls are silently dropped, never queued, and never throw. On `visibilitychange` hidden the context is suspended and resumed on return (also covers iOS interruptions).
* **Mute persistence:** `overclock_audio_muted` (boolean) and `overclock_audio_volume` in `localStorage`, read/written inside `try/catch` as in `createRoomSlice.ts`/`useI18n.ts`; default is **unmuted at moderate volume** only after the first gesture, and the mute button in the HUD toggles the master gain (`setValueAtTime` ramp, no clicks) and persists. A mute button is mandatory in the HUD.
* **Asset budget:** 0 bytes of audio files; code budget for the audio module plus effects capped at **8 KB gzip** and it is dynamically `import()`ed so it is not in the initial bundle. If samples are ever added they must total **<= 150 KB** per match and be lazy-loaded after first interaction (requires a follow-up ADR amendment).
* **Failure mode:** if `AudioContext` is unavailable or throws, the engine becomes a no-op (graceful degradation, like the WebGL capability detection of ADR 0010); gameplay never depends on audio.
* **No contract or backend change:** audio is driven entirely by already-validated events and store state; nothing is added to SignalR, REST or `tests/contracts/signalr/`.

### Enforcement

* **Dependency guard:** `frontend/package.json` must not gain `howler` / `@types/howler` / `tone`; an ESLint `no-restricted-imports` entry (`howler`, `tone`) is added in the frontend lint config when this ADR is accepted so any such import fails `verify.sh --fast`. (Changing lint config is a harness-adjacent change that needs explicit human approval at implementation time.)
* **Unit tests (Vitest, no real audio):** `shared/lib/audio/audioEngine.test.ts` uses a fake `AudioContext`: `play` before unlock is a silent no-op; first gesture calls `resume()` once; mute sets master gain to 0 and persists to `localStorage`; persisted mute is restored on start; storage that throws is tolerated; missing `AudioContext` makes every call a no-op; `visibilitychange` suspends/resumes.
* **Event wiring tests:** a test on `recordGameEvent`/handlers asserts that `TraceCalled`, `VoltageTestStarted`, `CapacitorDischarged` and card play trigger the matching effect, with `riskLevel` forwarded to `voltageBuzz`.
* **Budget check:** the Vite build (`verify.sh`) is followed by a size assertion on the dynamically imported audio chunk (<= 8 KB gzip) in the frontend build test, and a test fails if any file under `frontend/public` or `src` with an audio extension (`.mp3`, `.ogg`, `.wav`) is added without amending this ADR.
* No backend, contract fixture or `Architecture.Tests` change.

## Consequences

### Positive

* No new dependency, no audio downloads; consistent with the procedural-asset approach of ADR 0010.
* Effects react to game state (risk-driven buzzer) which sampled sounds cannot do without extra files.
* Fully unit-testable with a fake `AudioContext`.

### Negative

* We maintain the unlock/suspend logic and the sound-design code ourselves.
* Synthesized effects need ear-tuning and will not match recorded production audio; replacing them later with samples means an ADR amendment and a bundle/asset budget review.
* ADR 0002 and `frontend-guidelines.md` mention Howler.js and must be updated once this ADR is accepted (documentation drift until then).
