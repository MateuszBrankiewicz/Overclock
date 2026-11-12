# UX-04 — Suspens w teście napięcia

> ADR: [0009](../adr/0009-voltage-test-hardware-exploits-and-timing-windows.md) (Accepted) — bez zmiany reguł ani kontraktu
> Zakres: frontend · Bez nowych zależności
> Commit: `feat(frontend): capacitor drum spin-down before discharge (UX-04)`

## Problem

Bęben kondensatora w `TableCenterpiece3D.tsx` kręci się ze stałą prędkością, a po zdarzeniu
`CapacitorDischarged` wynik i błyskawica pojawiają się natychmiast. Najważniejszy moment gry nie ma
budowania napięcia.

## Kroki

1. W `utils/cinematicTiming.ts` dodaj `DRUM_SPINDOWN_MS` (~1400 ms) i wlicz go do
   `dischargeCinematicDurationMs`. Zaktualizuj `cinematicTiming.test.ts`.
2. Faza zwalniania (czas liczony od `dischargeCinematic.startedAtMs`):
   - bęben wyhamowuje krzywą ease-out i zatrzymuje się na komorze wynikającej z `event.roll`,
   - komory „gorące” (`i < riskLevel`) pulsują coraz szybciej,
   - `voltageBuzz` rośnie w wysokości (parametr w `AudioEffectParams`).
3. Dopiero po `DRUM_SPINDOWN_MS` startują: `LightningArc3D`, plakietka wyniku
   (`createDischargeBadgeTexture`), poza z `deathPose.ts` / `computeShockPose`, dźwięk `discharge`,
   wibracja. Przesunięcie realizuj jednym wspólnym offsetem przekazywanym jako czas startu efektu,
   żeby nie przepisywać kluczowych klatek w `deathPose.ts` i `CameraController.tsx`.
4. Przycisk pominięcia (`CameraPresetBar`, `onDismissDischarge`) nadal kończy całość od razu.
5. `prefers-reduced-motion`: faza zwalniania pominięta (offset 0).
6. Testy: `traceCinematic.test.ts` (kolejność i długości faz), `deathPose.test.ts` (offset nie zmienia póz).
7. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [ ] Między rozpoczęciem wyładowania a wynikiem jest ~1,4 s narastającego napięcia.
- [ ] Wynik nie jest widoczny ani słyszalny przed zatrzymaniem bębna.
- [ ] Obraz, dźwięk i wibracja trafiają w ten sam moment.
