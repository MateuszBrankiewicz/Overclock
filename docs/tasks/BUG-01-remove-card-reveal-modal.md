# BUG-01 — Zbędny modal z kartami podczas sprawdzenia (Call Trace)

> Typ: **bug** · Zakres: frontend · ADR: brak nowego (prezentacja, bez zmian kontraktu)
> Commit: `fix(frontend): drop card reveal panel, keep 3D card flip only`

## Objaw

Po „Call Trace” na środku/górze ekranu pojawia się panel `CardRevealSequence` z listą odkrytych kart,
deklarowanym protokołem i werdyktem. Jednocześnie te same karty odwracają się na stole 3D
(`RevealedCards3D`). Panel dubluje informację i zasłania stół.

## Oczekiwane zachowanie

- Podczas sprawdzenia **jedynym** wizualnym odkryciem jest odwrócenie kart na stole 3D.
- Nie pojawia się żaden modal / panel HTML z kartami.
- Werdykt (blef / uczciwie) jest czytelny z samego stołu: kolor ramki karty (`match` / `wild` / `bluff`
  z `hud/cardMarks.ts`) + krótki efekt na oskarżonym albo oskarżycielu (kto przegrał).
- Wpis w feedzie zdarzeń zostaje (np. „X sprawdza Y — blef!”).

## Gdzie jest problem

- `frontend/src/features/game/components/OperatingTable.tsx` — gałąź `revealResolution ? (...)`
  renderuje `<div className="fixed top-14 ...">` z `<CardRevealSequence ... />`.
- `frontend/src/features/game/components/CardRevealSequence.tsx` + `CardRevealSequence.test.tsx`.
- Tłumaczenia `reveal.*` w `frontend/src/shared/i18n/useI18n.ts` (typ + PL + EN).

## Kroki

1. **Test regresji (czerwony).** W `frontend/src/features/game/components/OperatingTable.test.tsx`
   (uwaga: `renderToString` widzi tylko stan początkowy Zustanda, więc testuj przez propsy) dodaj
   test, że `BunkerArenaCanvas` w trakcie odkrycia (`roomState: 'BluffCheck'`, `revealedCards` ustawione,
   `overlayMode: 'passive'`, **bez** `children`) nie renderuje `data-testid="card-reveal-sequence"`
   (sprawdź faktyczny testid w `CardRevealSequence.tsx`). Dodatkowo test jednostkowy czystej funkcji
   z kroku 3, która decyduje, co jest w środkowym overlayu.
2. **Usuń panel z `OperatingTable.tsx`:**
   - wytnij całą gałąź `revealResolution ? (<div className="fixed top-14 ..."><CardRevealSequence/></div>)`,
   - zamień ją na `revealResolution ? null : ...` (w trakcie odkrycia środek ekranu jest pusty),
   - usuń `accuserNickname` / `accusedNickname`, jeśli nie są już nigdzie używane,
   - usuń import `CardRevealSequence`.
3. **Wydziel decyzję o środkowym overlayu** do czystej funkcji, np.
   `frontend/src/features/game/utils/centerOverlay.ts`:
   `resolveCenterOverlay({ roomState, isRevealing, isDischarging, ... }) => 'lobby' | 'summary' | 'intermission' | null`.
   `OperatingTable` tylko mapuje wynik na komponent. Ułatwia testy (BUG-02 korzysta z tej samej funkcji).
4. **Usuń martwy kod:** `CardRevealSequence.tsx`, `CardRevealSequence.test.tsx`
   (`grep -rn CardRevealSequence frontend/src` musi zwrócić 0 wyników) oraz klucze `reveal.*` z typu
   `Translations` i z obu słowników (PL/EN), o ile nie są używane gdzie indziej.
5. **Werdykt na stole 3D** (`frontend/src/features/game/components/arena3d/RevealedCards3D.tsx`):
   - po odwróceniu ostatniej karty (`startedAtMs + total * REVEAL_CARD_STAGGER_MS + FLIP_DURATION_MS`)
     karty z oznaczeniem `bluff` dostają mocniejszy czerwony puls `emissiveIntensity`
     (np. 1.6 → 3.0 sinusoidalnie), karty `match`/`wild` — zielone/fioletowe podświetlenie,
   - nowy prop `bluffDetected: boolean` przekazywany z `TableCenterpiece3D` → `BunkerArenaCanvas`
     → `OperatingTable` (`traceReveal.resolution.bluffDetected`); przy `true` na środku stołu krótki
     `LightningArc3D` (już istnieje) w stronę oskarżonego, przy `false` w stronę oskarżyciela.
     Pozycje miejsc liczy już `BunkerArenaCanvas` (`seatLayouts`, `computeOpponentSeatLayout`),
     przekaż do `TableCenterpiece3D` jako `revealLoserPos`.
   - `prefersReducedMotion()` → bez pulsu, od razu stan końcowy.
6. **Feed:** sprawdź `utils/formatFeedEvent.ts`, przypadek `TraceCalled`. Rozszerz tekst
   o werdykt: `traceCalled(who, target, bluff)` → PL „X sprawdza Y — BLEF!” / „X sprawdza Y — czysto”,
   EN „X traces Y — BLUFF!” / „X traces Y — clean”. Zaktualizuj `formatFeedEvent.test.ts`.
7. **Testy:**
   - `centerOverlay.test.ts`: w trakcie odkrycia → `null`,
   - `formatFeedEvent.test.ts`: oba warianty werdyktu PL/EN,
   - istniejące testy `traceCinematic.test.ts` muszą dalej przechodzić.
8. `bash scripts/verify.sh --fast` → zielone. Ręcznie: 2 karty w przeglądarce, zagraj blef,
   sprawdź → na ekranie tylko karty na stole, bez panelu.

## Kryteria akceptacji

- [ ] Brak jakiegokolwiek modala / panelu z kartami w trakcie sprawdzenia (desktop i mobile).
- [ ] Karty odwracają się kolejno na stole; ramki mają kolor zgodny z `classifyCard`.
- [ ] Werdykt widać na stole (puls + łuk) i w feedzie.
- [ ] `CardRevealSequence` usunięty razem z testem i nieużywanymi tłumaczeniami.
- [ ] `verify.sh --fast` zielone.
