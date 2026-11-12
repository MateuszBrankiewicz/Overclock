# GFX-02 — Oświetlenie i otoczenie bunkra

> ADR: brak ([ADR 0010](../adr/0010-webgl-3d-bunker-arena-character-selection-and-mobile-first-viewport.md))
> Zakres: frontend · Bez nowych zależności, bez plików modeli i tekstur (wszystko proceduralne)
> Commit: `feat(frontend): moody lighting and procedural bunker set (GFX-02)`

## Cel

Dziś: `ambientLight 0.6` i trzy światła punktowe spłaszczają scenę, podłoga to `gridHelper`,
tło to cztery pudełka. Scena ma wyglądać jak ciasny, ciemny bunkier z jednym mocnym źródłem światła.

## Kroki

1. **Światło** (`BunkerArenaCanvas.tsx`):
   - `ambientLight` 0.6 → ~0.15, dodaj `hemisphereLight` (chłodne niebo / ciemna ziemia, ~0.25),
   - lampa nad stołem jako światło kluczowe: mocniejszy `spotLight`, miękkie cienie
     (`shadow-mapSize` 1024, `shadow-bias`), przypnij je do kołyszącej się `lampGroupRef`,
     żeby cienie poruszały się razem z lampą,
   - boczne światła cyjan/bursztyn zostają jako kontry, o połowę słabsze,
   - płynne przejście koloru lampy między fazami (lerp w `useFrame` zamiast skoku).
2. **Podłoga**: usuń `gridHelper`; płaszczyzna z teksturą canvas (betonowe płyty, szczeliny, plamy —
   generator w stylu `pcbCardTexture.ts`, z cache), `roughness ~0.85`, odbiera cienie.
   Pod stołem ciemna plama „ambient occlusion” (radialny gradient na przezroczystej płaszczyźnie).
3. **Ściany i sufit**: prosty box wokół sceny (widoczny przez mgłę), rury i korytka kablowe
   z cylindrów wzdłuż sufitu, kabel od lampy do sufitu.
4. **Szafy serwerowe** (`TableCenterpiece3D.tsx`): zamiast dwóch pasków — siatka małych diod
   (`InstancedMesh`), migających pseudolosowo; w `BluffCheck` wszystkie na czerwono,
   w `VoltageTest` przygasają w rytm brzęczenia.
5. **Atmosfera**: ~150 drobin kurzu (`Points`) dryfujących w stożku lampy; stożek światła z gradientem
   przezroczystości zamiast jednolitego `opacity 0.07`.
6. Przy `prefers-reduced-motion`: bez migania diod i dryfu kurzu.
7. Budżet: ≤ 15 dodatkowych draw calli (instancing), brak spadku FPS na mobile — pomiar w commicie.
8. Testy: generator tekstury podłogi zwraca tę samą teksturę z cache dla tych samych parametrów;
   istniejące testy areny przechodzą.
9. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [ ] Stół jest najjaśniejszym miejscem sceny, tło ginie w półmroku.
- [ ] Nie widać siatki pomocniczej ani „pustki” za szafami.
- [ ] Karty w ręce i twarze kart na stole pozostają czytelne (kontrast nie gorszy niż przed zmianą).
