# GFX-01 — Bloom, tone mapping i winieta

> ADR: [0010](../adr/0010-webgl-3d-bunker-arena-character-selection-and-mobile-first-viewport.md) — **sprawdź przed startem**, czy dopuszcza post-processing.
> Jeśli nie albo jeśli chcesz użyć `@react-three/postprocessing` (nowa zależność) → najpierw
> `scripts/new-adr.sh "Post-processing pipeline for the 3D arena"` i czekaj na `Accepted`.
> Zakres: frontend · Wariant domyślny bez nowych zależności (`three/addons`)
> Commit: `feat(frontend): bloom and filmic tone mapping in arena (GFX-01)`

## Cel

Scena opiera się na materiałach emisyjnych (pierścienie stołu, wizjery, karty, błyskawice), które bez
poświaty wyglądają płasko. Bloom to pojedyncza zmiana o największym efekcie wizualnym.

## Kroki

1. Nowy komponent `arena3d/ArenaPostFx.tsx` wewnątrz `<Canvas>`: `EffectComposer` + `RenderPass` +
   `UnrealBloomPass` + `OutputPass` z `three/addons/postprocessing/*` (są częścią pakietu `three`).
   Render przez `useFrame(..., 1)`, `composer.setSize` przy zmianie rozmiaru, `dispose` przy odmontowaniu.
2. Parametry startowe: `strength 0.7`, `radius 0.55`, `threshold 0.75`. Bloom ma łapać tylko elementy
   o `emissiveIntensity > 1` — po włączeniu przejrzyj i obniż przesadzone wartości
   (np. `3.5` na laserze, `12` na błyskawicy), żeby nie wypalały obrazu.
3. `Canvas`: `gl={{ toneMapping: ACESFilmicToneMapping }}`, ekspozycja ~1.1.
4. Winieta i lekkie ziarno jako nakładka CSS nad canvasem (radial-gradient), nie jako kolejny pass —
   taniej na mobile. Usuń globalne `.scanlines` z widoku stołu albo osłab je o połowę: razem z bloomem
   obniżają czytelność tekstu HUD.
5. **Jakość**: ustawienie `gfxQuality: 'low' | 'high'` (mały store jak `useAudioSettings.ts`,
   `localStorage` w try/catch). Domyślnie `low` dla `(pointer: coarse)` i przy `prefers-reduced-motion`
   — wtedy brak composera, zwykły render. Przełącznik w górnym pasku.
6. Tryb `frameloop="demand"` w lobby (`useArenaFrameloop.ts`) musi dalej działać — composer renderuje
   tylko, gdy R3F wywoła klatkę.
7. Pomiar: FPS przed i po na telefonie średniej klasy i na desktopie; wynik w opisie commita.
   Jeśli mobile spada poniżej ~45 FPS, bloom w połowie rozdzielczości.
8. Testy: store jakości (domyślne wartości, błąd `localStorage`), `BunkerArenaCanvas.test.tsx` nadal
   przechodzi (jsdom → fallback bez WebGL).
9. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [ ] Elementy emisyjne mają miękką poświatę, tekst HUD i kart pozostaje ostry.
- [ ] Tryb `low` renderuje identycznie jak przed zmianą.
- [ ] Brak nowych pakietów w `package.json` (albo zaakceptowany ADR).
