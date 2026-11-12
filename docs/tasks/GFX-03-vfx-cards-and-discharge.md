# GFX-03 — Efekty cząsteczkowe: karty, wyładowanie, hologram

> ADR: brak ([ADR 0010](../adr/0010-webgl-3d-bunker-arena-character-selection-and-mobile-first-viewport.md))
> Zakres: frontend · Bez nowych zależności
> Zależy od: GFX-01 (efekty projektowane pod bloom)
> Commit: `feat(frontend): particle vfx for cards and discharge (GFX-03)`

## Cel

Kluczowe zdarzenia (zagranie, odsłonięcie, wyładowanie, eliminacja) mają mieć fizyczny „ciężar”.

## Kroki

1. Wspólny, mały system cząstek `arena3d/vfx/ParticleBurst.tsx`: `InstancedMesh` / `Points`
   z pulą o stałym rozmiarze, czysta funkcja kroku symulacji (pozycja, prędkość, grawitacja, zanik)
   testowalna bez WebGL.
2. **Zagranie kart**: smuga w kolorze protokołu za lecącymi kartami (`flyingGroupRef`),
   przy lądowaniu krótki rozbłysk pierścienia stołu i lekki podskok stosu.
3. **Odsłonięcie**: przy odwróceniu każdej karty mały błysk; karta-blef dostaje czerwone iskry
   i krótkie zakłócenie (przesunięcie UV / migotanie emisji), karta zgodna — zielony puls.
4. **Wyładowanie**: iskry w punkcie trafienia (`shockTargetPos`), rozbłysk `pointLight` trwający
   ~120 ms, dym po przeciążeniu; błyskawica `LightningArc3D` z 2–3 odgałęzieniami i grubszym rdzeniem.
5. **Eliminacja**: wizjer gaśnie z migotaniem zamiast natychmiast, z korpusu przez ~2 s unosi się dym.
6. **Hologram protokołu**: zamiast pigułki HTML nad stołem — duży symbol protokołu jako płaszczyzna
   z teksturą canvas, addytywne mieszanie, linie skanowania i lekkie drganie; licznik stosu i tura
   zostają w HTML obok (czytelność tekstu).
7. **Ręka gracza**: karta zaznaczona unosi się z delikatnym kołysaniem i poświatą krawędzi;
   karty rozdawane na start rundy wsuwają się po kolei (stagger 60 ms).
8. `gfxQuality: 'low'` (z GFX-01) i `prefers-reduced-motion`: liczba cząstek 0, zostają same
   zmiany koloru.
9. Testy: funkcja kroku cząstek (zanik do zera, brak NaN), pula nie rośnie ponad limit.
10. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [ ] Każde z czterech zdarzeń ma wyraźny efekt, zgrany z dźwiękiem (UX-03) i czasami z `cinematicTiming.ts`.
- [ ] Brak alokacji w pętli klatek (pula, bez `new Vector3` w `useFrame`).
- [ ] Tryb `low` nie renderuje cząstek.
