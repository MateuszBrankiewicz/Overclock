# UX-07 — Pełne wsparcie `prefers-reduced-motion`

> ADR: brak (dostępność)
> Zakres: frontend · Bez nowych zależności
> Commit: `fix(frontend): honour reduced motion across arena and hud (UX-07)`

## Problem

Ograniczenie ruchu respektują tylko lot kart i odwracanie (`TableCenterpiece3D`, `RevealedCards3D`).
Nie respektują go: trzęsienie i upadek kamery w `CameraController.tsx`, `OverloadVignette`,
kołysanie lampy oraz liczne `animate-pulse` w HUD. Funkcja `prefersReducedMotion` jest zdublowana
w `hud/motion.ts` i `shared/lib/haptics.ts`.

## Kroki

1. Jedno źródło: przenieś `prefersReducedMotion` i hook `usePrefersReducedMotion`
   (`useSyncExternalStore` z nasłuchem `change`) do `shared/lib/motion.ts`; `haptics.ts` i `hud/motion.ts`
   importują stamtąd.
2. `CameraController`: przy ograniczonym ruchu sekwencja śmierci to płynne przejście do kamery widza
   bez wstrząsów, uderzenia w stół i obrotu `rotateZ`.
3. `OverloadVignette`, `TimerBar`, `TurnUrgencyCountdown`, `VoltageControls`, `RoundIntermissionBanner`:
   zamień `animate-pulse` na `motion-safe:animate-pulse`.
4. Lampa i bęben w `TableCenterpiece3D`, poza wstrząsu w `OperatorRig3D`: statyczne przy ograniczonym ruchu.
5. Test: mock `matchMedia` → kamera nie dostaje `rotateZ`, klasy pulsowania są warunkowe.
6. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [x] Przy włączonym ograniczeniu ruchu nic nie trzęsie się ani nie pulsuje; informacja pozostaje czytelna.
- [x] Jedna implementacja wykrywania preferencji w całym froncie.
