# T-0014 — Silnik audio na Web Audio API (efekty)

> ADR: [0014](../adr/0014-game-audio-engine-on-the-web-audio-api.md) (Accepted)
> Zakres: frontend · Bez nowych zależności, 0 plików audio
> Commit: `feat(frontend): web audio engine with synthesized game sfx (ADR 0014)`
>
> Głosy robotów (mowa) są osobnym taskiem: [T-0016](T-0016-robot-voices.md).

## Cel

Syntetyzowane efekty dźwiękowe gry (bez Howlera, bez plików) z obowiązkowym wyciszeniem w HUD.

## Kroki

1. **Struktura** `frontend/src/shared/lib/audio/`:
   - `audioEngine.ts` — singleton: leniwe `AudioContext`, `masterGain`, `setMuted`, `setVolume`,
     `play(effectName, params)`; gdy brak `window.AudioContext` → no‑op (żadnych wyjątków),
   - `effects.ts` — czyste funkcje budujące graf węzłów:
     `hum` (tło, pętla, niska głośność), `cardClick`, `traceSiren`,
     `voltageBuzz(riskLevel)` (wyższe ryzyko = wyższa częstotliwość/głośność), `discharge`,
     opcjonalnie `roundStart`, `eliminated`, `turnTick` (ostatnie 5 s),
   - `useAudioSettings.ts` — hook (Zustand slice lub osobny mały store) `muted`, `volume`.
2. **Odblokowanie autoplay**: jednorazowy listener `pointerdown` / `keydown` na `window` → `ctx.resume()`.
3. **Widoczność karty**: `visibilitychange` → `suspend()` / `resume()`.
4. **Ustawienia**: `localStorage` `overclock_audio_muted`, `overclock_audio_volume` — każdy dostęp w try/catch,
   domyślnie wł./0.6.
5. **Rozmiar**: moduł ładowany `import()` dynamicznie przy pierwszej interakcji; ≤ 8 KB gzip
   (sprawdź `npm run build` i rozmiar chunku).
6. **Podpięcie zdarzeń** w `features/game/hooks/useDebugTerminal.ts`, obok wywołań `vibrate`
   (`shared/lib/haptics.ts`) — przez cienką funkcję `playSfx(...)`, nie bezpośrednio w komponentach:
   `CardsPlayed` → `cardClick` × liczba kart (stagger ~60 ms),
   `TraceCalled` → `traceSiren`, `VoltageTestStarted` → `voltageBuzz(riskLevel)`,
   `CapacitorDischarged` → `discharge`, `RoundStarted` → `roundStart`,
   `PlayerEliminated` → `eliminated`; `hum` w trakcie gry, stop w lobby.
   Synchronizacja z animacjami: syrena/wyładowanie mogą być wyzwalane z kinematyk
   (`traceReveal`, `dischargeCinematic` w store), żeby dźwięk zgadzał się z obrazem.
7. **HUD**: przycisk wyciszenia (ikona głośnika, `aria-label` PL/EN z i18n, `aria-pressed`), widoczny
   na mobile i desktopie; opcjonalnie suwak głośności w ustawieniach.
8. **Lint (wymaga zgody człowieka — plik konfiguracji ESLint jest częścią bramek)**: reguła
   `no-restricted-imports` dla `howler` i `tone`. Zapytaj przed zmianą.
9. **Dokumentacja**: zgodnie z ADR zaktualizuj wzmiankę o Howler w
   [frontend-guidelines](../architecture/frontend-guidelines.md). ADR 0002 jest Accepted — **nie edytuj**;
   jeśli wymaga zmiany, to tylko przez nowy ADR (ADR 0014 już go uzupełnia).
10. **Testy Vitest** (fake `AudioContext` — prosta klasa z `createOscillator`/`createGain`/… zapisującą wywołania):
    - brak `AudioContext` → `play` nic nie robi i nie rzuca,
    - `muted` → `masterGain.gain.value === 0`,
    - localStorage rzuca → domyślne ustawienia,
    - `voltageBuzz(6)` ma wyższą częstotliwość niż `voltageBuzz(1)`,
    - handler `CardsPlayed` wywołuje `playSfx('cardClick')` (mock modułu).
11. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [ ] Wszystkie wymienione zdarzenia mają dźwięk, zgrany z animacją.
- [ ] Wyciszenie działa natychmiast i jest pamiętane po odświeżeniu.
- [ ] Brak błędów w konsoli przy braku Web Audio / zablokowanym autoplay.
- [ ] 0 nowych zależności, 0 plików audio, chunk ≤ 8 KB gzip.
