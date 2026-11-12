# 16. Robot voice lines via Web Speech API

Date: 2026-11-12

## Status

Accepted

Amends [0014](0014-game-audio-engine-on-the-web-audio-api.md).

<!--
Allowed values (validated by scripts/check-docs.sh):
  Proposed | Accepted | Rejected | Deprecated | Superseded by [NNNN](NNNN-title.md)
Optional extra line: "Amends [NNNN](NNNN-title.md)".
-->

## Context and Problem Statement

Task T-0016 calls for per-character vocal feedback during bluff gameplay events:
* When a player plays cards, their robot declares the action vocally (e.g., Polish "trzy beta" / English "three beta").
* When a player calls a bluff inspection (Call Trace), the accuser's robot interrupts and shouts an accusation (Polish "KŁAMCA!" / English "LIAR!").
* Optional short status voice lines upon elimination ("system... offline") or victory.

[ADR 0014](0014-game-audio-engine-on-the-web-audio-api.md) established a zero-asset, zero-dependency procedural audio engine using the Web Audio API for sound effects (card clicks, sirens, voltage buzzer, discharge crackle). ADR 0014 did not cover vocal speech synthesis.
[ADR 0012](0012-synchronised-character-selection-via-playerseat-characterid.md) established authoritative character identities (`ghost`, `volt`, `proxy`, `null`).

Spoken lines require distinct character identity, low latency, localized pronunciation in Polish and English, adherence to browser autoplay restrictions, and user control. Adding voice lines must not compromise the zero-asset (0 KB audio files) and zero-dependency principles of ADR 0014.

## Decision Drivers

* **Zero asset downloads:** 0 KB of pre-recorded audio files (`.mp3`, `.wav`, `.ogg`), keeping the bundle minimal and mobile network load non-existent.
* **Zero new dependencies:** No third-party TTS libraries or cloud synthesis wrappers added to `package.json`.
* **Distinct robotic character identities:** Each of the 4 characters (`ghost`, `volt`, `proxy`, `null`) must have audible differentiation via speech modulation parameters (`pitch`, `rate`, `volume`, and deterministic system voice heuristics) paired with procedural Web Audio preamble blips (e.g. low frequency sweep, electrical zap, modem blip).
* **Deterministic queueing and interruption:** Speech lines must not overlap; an urgent accusation ("LIAR!") must immediately cancel any in-flight card declaration (`speechSynthesis.cancel()`). Duplicate SignalR events across reconnection must be deduplicated via event `sequenceNumber`, and queue length must be capped at 2.
* **Localization & Accessibility:** Dynamic language switching (`pl-PL` / `en-US`) matching `useI18n`, and independent user opt-out (`overclock_voice_enabled`) alongside master audio mute and volume controls.
* **Graceful degradation and testability:** Silent no-op when `window.speechSynthesis` is unavailable; fully testable in Vitest using mock interfaces.

## Considered Options

1. **Option 1 (Chosen): Native Web Speech API (`window.speechSynthesis`) + Character Voice Profiles + Web Audio Preamble Blips.**
   * *Pros:* 0 bytes in audio assets, 0 external dependencies, native system synthesis engine with zero network latency, parameterized pitch/rate/volume per robot, and robotic flavor achieved by preceding speech with procedural Web Audio synthesizer cues.
   * *Cons:* Browser/OS voice timbers vary across platforms (e.g. Android vs iOS vs Linux vs Windows); direct Web Audio DSP filter chains cannot be attached directly to `SpeechSynthesisUtterance`.
2. **Option 2: Pre-recorded audio sample files.**
   * *Pros:* Complete control over robotic post-processing and vocoder sound design.
   * *Cons:* Directly violates the zero-asset constraint of ADR 0014. Requiring samples for every card count (1–4), protocol (alpha, beta, gamma, delta, omega), accusations, and status lines across both Polish and English would add dozens of audio files and megabytes to the application footprint.
3. **Option 3: Custom formant speech synthesizer in pure Web Audio API.**
   * *Pros:* Fully controllable synthesized robotic timbre directly in the Web Audio graph without external voice dependencies.
   * *Cons:* Extreme engineering complexity to build a custom formant synthesis engine capable of pronouncing arbitrary Polish and English phrases accurately.

## Decision Outcome

Chosen Option: **Option 1**.

### Design

* **Voice Profiles (`frontend/src/shared/lib/audio/voiceProfiles.ts`):**
  Defines specific acoustic modulation profiles for each character:
  - `ghost`: low pitch (0.4), slow rate (0.85), whisper-like presence, low sweep preamble blip.
  - `volt`: high pitch (1.6), fast rate (1.25), hyperactive cadence, electrical zap preamble blip.
  - `proxy`: neutral pitch (1.0), standard rate (1.0), corporate synthesized cadence, modem pulse preamble blip.
  - `null`: deep pitch (0.7), stuttered/measured rate (0.75), glitch tone preamble blip.
* **Preamble Blips:**
  Procedural sound effects generated on-demand via the Web Audio engine (`audioEngine.play('voiceBlip', ...)`) immediately preceding the speech utterance.
* **Voice Manager (`frontend/src/shared/lib/audio/robotVoice.ts`):**
  - Manages utterance execution with a strict FIFO queue (maximum depth of 2).
  - High-priority interruptions: calling `speak(..., { priority: 'high' })` immediately aborts active utterances via `speechSynthesis.cancel()` before firing the accusation.
  - Event deduplication: tracks the latest processed `sequenceNumber` to prevent replay on SignalR reconnection.
  - Respects master `muted` and `volume` from ADR 0014 (`useAudioSettings`), as well as an independent voice toggle `overclock_voice_enabled`.
  - Tab visibility: clears queue and cancels active utterances on `document.visibilitychange` hidden.
* **Localization (`frontend/src/shared/i18n/useI18n.ts`):**
  Provides grammatical localized phrases for card counts and protocols in Polish (`pl-PL`) and English (`en-US`), as well as the accusation shout ("KŁAMCA!" / "LIAR!").
* **Wiring (`frontend/src/features/game/hooks/useDebugTerminal.ts`):**
  Hooked alongside existing SFX triggers:
  - `conn.on('CardsPlayed')`: declares card count and protocol using the acting seat's character.
  - `conn.on('TraceCalled')`: accuser character shouts "LIAR!" with high priority.

### Enforcement

* **Zero Asset Guard:** An automated Vitest test asserts that zero audio files (`.mp3`, `.ogg`, `.wav`) exist in `frontend/public` or `frontend/src`.
* **Zero Dependency Guard:** No additions to `dependencies` in `frontend/package.json`.
* **Character Coverage Parity:** Vitest test validates that `VOICE_PROFILES` defines an entry for every `CharacterId` in `CharacterCatalog.json`.
* **Unit Tests (Vitest):**
  `frontend/src/shared/lib/audio/robotVoice.test.ts` exercises the manager with mock `SpeechSynthesis` and `SpeechSynthesisUtterance`:
  - Distinct pitch and rate settings are applied across different character profiles.
  - Calling a high-priority line invokes `cancel()` on the active utterance.
  - Mute and disabled voice settings prevent speech execution.
  - Identical `sequenceNumber` events are executed only once.
  - Missing `window.speechSynthesis` degrades gracefully without throwing errors.
* **Harness Verification:** `bash scripts/verify.sh --fast` must pass with 0 failures.

## Consequences

### Positive

* Delivers immersive vocal character identities without increasing application bundle size or downloading external media files.
* Fully respects user accessibility, volume controls, and mute settings.
* Localized out of the box in Polish and English.
* Robust against event replay and queue saturation during rapid play.

### Negative

* Speech timbre is influenced by system-installed TTS voices on the user's operating system and browser; character differentiation relies primarily on pitch, speech rate, and Web Audio preamble blips.
* Requires browser support for the Web Speech API; platforms without TTS support degrade silently to preamble sound effects alone.
