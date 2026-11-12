# T-0016 — Głosy robotów („3 beta”, „KŁAMCA!”)

> ADR: **do napisania** — 0016 „Robot voice lines” (Proposed, uzupełnia 0014). Implementacja dopiero po **Accepted**.
> Zakres: frontend · Zależy od: [T-0014](T-0014-audio-engine.md), [T-0012](T-0012-character-sync.md)
> Commit: `feat(frontend): per-character robot voice lines (ADR 0016)`

## Cel

Każdy robot ma własny, rozpoznawalny głos:

- przy zagraniu kart mówi deklarację, np. **„trzy beta”** / „three beta”,
- przy sprawdzeniu (Call Trace) oskarżyciel **krzyczy „KŁAMCA!”** / „LIAR!”,
- opcjonalnie krótkie kwestie: eliminacja („system… offline”), wygrana.

## Krok 0 — ADR (blokujący)

ADR 0014 zakłada tylko Web Audio API (syntezowane efekty). Mowa to nowe API przeglądarki,
więc wymagany jest nowy ADR:

1. `scripts/new-adr.sh "Robot voice lines via Web Speech API"` → `docs/adr/0016-...md`, status **Proposed**,
   „Amends 0014”.
2. Rozważane opcje:
   - **A (rekomendowana): Web Speech API** (`speechSynthesis`) + profil głosu per postać
     (`pitch`, `rate`, `volume`, preferowany głos systemowy) + przed kwestią robotyczny „blip”
     z Web Audio (filtr/bitcrush nie da się nałożyć na `speechSynthesis`, więc charakter robota
     budujemy parametrami + blipem). 0 zależności, 0 plików.
   - B: nagrane/wygenerowane próbki per postać (pliki audio — łamie „0 plików” z 0014, rozmiar bundla).
   - C: własny formantowy syntezator na Web Audio (pełna kontrola brzmienia, duży nakład pracy).
3. Sekcja **Enforcement**: testy Vitest z fałszywym `speechSynthesis`; brak nowych zależności
   (`package.json` bez zmian w `dependencies`); wyciszenie z T-0014 obejmuje głosy.
4. Rejestracja w `docs/adr/README.md`. **Stop** — czekaj na akceptację człowieka.

## Kroki implementacji (po Accepted)

5. **Profile głosów** `frontend/src/shared/lib/audio/voiceProfiles.ts`:
   ```ts
   export const VOICE_PROFILES: Record<CharacterId, VoiceProfile> = {
     ghost: { pitch: 0.4, rate: 0.85, volume: 0.9, blip: 'lowSweep' },   // niski, powolny, szept
     volt:  { pitch: 1.6, rate: 1.25, volume: 1.0, blip: 'zap' },        // wysoki, szybki, nerwowy
     proxy: { pitch: 1.0, rate: 1.0,  volume: 0.9, blip: 'modem' },      // neutralny, „korporacyjny”
     null:  { pitch: 0.7, rate: 0.75, volume: 1.0, blip: 'glitch' },     // głęboki, przerywany
   };
   ```
   Klucze muszą odpowiadać `CharacterCatalog` (T-0012). Dodatkowo `voiceHint` — preferencja głosu
   (męski/żeński/indeks) wybierana z `speechSynthesis.getVoices()` dla danego języka, deterministycznie,
   żeby dwie postacie nie dostały tego samego głosu, jeśli system ma ich kilka.
6. **Teksty** w i18n (`shared/i18n/useI18n.ts`, PL i EN):
   - `voice.playCards(count, protocol)` → PL: liczebnik słownie + nazwa protokołu
     („jedna alfa”, „dwie bety”, „trzy beta”, „cztery…”) — dopracuj odmianę z ludzkim recenzentem;
     EN: „one alpha”, „two beta”, „three beta”,
   - `voice.liar` → „KŁAMCA!” / „LIAR!”,
   - `voice.eliminated`, `voice.win` (opcjonalne).
   Język syntezy = aktualny język UI (`pl-PL` / `en-US`).
7. **Moduł** `frontend/src/shared/lib/audio/robotVoice.ts`:
   - `speak(characterId, line, { priority })` — brak `speechSynthesis` → no‑op,
   - **kolejka bez nakładania**: kolejna kwestia czeka na `onend`; „LIAR!” ma priorytet i przerywa
     bieżącą (`speechSynthesis.cancel()`),
   - przed `speak` krótki blip z Web Audio (`audioEngine.play('voiceBlip', profile.blip)`),
   - respektuje `muted` / `volume` z `useAudioSettings` (`utterance.volume = profile.volume * volume`),
   - deduplikacja po `sequenceNumber` zdarzenia (reconnect / powtórzony event nie mówi dwa razy),
   - przycinanie kolejki do 2 elementów (przy szybkiej grze nie gonimy zaległości),
   - `visibilitychange` hidden → `cancel()`.
8. **Podpięcie** w `features/game/hooks/useDebugTerminal.ts`, obok efektów z T-0014:
   - `CardsPlayed` (`playerId`, `cardCount`, `declaredProtocol`) → postać gracza
     z `players[].characterId` (T-0012; przed T-0012 fallback `resolveSeatCharacter`) →
     `speak(character, t.voice.playCards(cardCount, declaredProtocol))`,
   - `TraceCalled` (`accuserPlayerId`) → `speak(characterOfAccuser, t.voice.liar, { priority: 'high' })`
     zsynchronizowane ze startem `traceReveal` (krzyk przed odwróceniem pierwszej karty;
     ewentualnie zwiększ opóźnienie pierwszej karty w `cinematicTiming.ts`),
   - opcjonalnie `PlayerEliminated` / `GameOver`.
9. **Ustawienia**: osobny przełącznik „Głosy robotów” obok wyciszenia (localStorage
   `overclock_voice_enabled`, try/catch) — część graczy będzie chciała same efekty.
10. **Testy Vitest** (fałszywy `speechSynthesis` + `SpeechSynthesisUtterance`):
    - różne postacie → różne `pitch`/`rate`,
    - `CardsPlayed` 3 × beta → tekst „trzy beta” (PL) / „three beta” (EN),
    - `TraceCalled` → „KŁAMCA!” głosem oskarżyciela, przerywa trwającą kwestię,
    - muted / voice off → `speak` nie wywołany,
    - ten sam `sequenceNumber` dwa razy → jedna kwestia,
    - brak `speechSynthesis` → brak wyjątków,
    - test parytetu: `VOICE_PROFILES` ma klucz dla każdej postaci z `CharacterCatalog.json`.
11. **Test ręczny**: Chrome + Firefox (Linux/Android) — lista głosów różni się między systemami;
    sprawdź, że wszystkie 4 postacie są rozróżnialne nawet przy jednym dostępnym głosie (pitch/rate).
12. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [ ] ADR 0016 zaakceptowany przed implementacją.
- [ ] Każdy z 4 robotów brzmi inaczej (słyszalnie rozróżnialne pitch/tempo/blip).
- [ ] Zagranie kart → robot mówi liczbę i protokół; sprawdzenie → oskarżyciel krzyczy „KŁAMCA!”.
- [ ] Kwestie się nie nakładają, nie powtarzają po reconnect, respektują wyciszenie.
- [ ] 0 nowych zależności, testy zielone.
