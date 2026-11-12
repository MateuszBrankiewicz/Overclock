# GFX-04 — Spójny język wizualny UI (panele, ikony, typografia)

> ADR: brak, o ile font jest plikiem w repo; biblioteka UI lub pakiet fontów z npm = nowa zależność → ADR
> Zakres: frontend · Bez nowych zależności
> Commit: `feat(frontend): unified hud panel style, icons and type scale (GFX-04)`

## Problem

Każdy panel ma własny zestaw klas (`bg-black/85 border-zinc-800 rounded-xl`, różne cienie i rozmiary),
emoji (🚨 🛡️ ⚡ ▶) stoją obok ikon lucide, a wszystko jest jednym krojem mono w rozmiarach 9–12 px.

## Kroki

1. **Tokeny** w `tailwind.config` (`theme.extend`): kolory semantyczne (`hud-bg`, `hud-border`,
   `accent`, `danger`, `warn`, `info` + kolory protokołów — jedno źródło wspólne z `PROTOCOL_HEX`
   w `TableCenterpiece3D.tsx` i `MARK_COLOR` w `hud/cardMarks.ts`), skala cieni-poświat (`glow-sm/md/lg`),
   skala tekstu HUD.
2. **Prymitywy** w `shared/ui/`: `HudPanel` (ścięte narożniki przez `clip-path`, cienka ramka,
   narożne „znaczniki celownika”, wariant `tone`), `HudButton` (primary / danger / ghost, stany
   disabled i active), `HudBadge`. Zamień nimi ręcznie sklejane klasy w `ActionStrip`, `TimerBar`,
   `VoltageControls`, `RoundIntermissionBanner`, `MatchSummary`, `ToastHost`, `CameraPresetBar`.
3. **Ikony**: usuń emoji z przycisków i banerów, zastąp ikonami `lucide-react`
   (`Siren`, `Shield`, `Zap`, `Play`); emoji w tekstach i18n też.
4. **Typografia**: krój wyświetlany (techniczny, szeroki) dla nagłówków i dużych liczb
   — plik `.woff2` na licencji OFL w `frontend/src/assets/fonts/`, `@font-face` z `font-display: swap`;
   mono zostaje dla danych. Licencję fontu dołącz obok pliku.
5. **Przyciski akcji**: TRACE i TRANSMIT większe (min. 48 px wysokości na mobile), z wyraźnym stanem
   „to twoja tura” (obrys biegnący po krawędzi zamiast `animate-pulse`).
6. **Mikroanimacje**: wejście/wyjście paneli przez `motion/react` (150–200 ms), licznik ryzyka
   „przeskakuje” przy zmianie wartości.
7. Testy: snapshoty niepotrzebne; zaktualizuj istniejące testy komponentów pod nowe znaczniki,
   dodaj test `HudButton` (disabled nie wywołuje `onClick`).
8. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [ ] Wszystkie panele HUD korzystają z `HudPanel` / `HudButton`; brak zduplikowanych łańcuchów klas.
- [ ] Zero emoji w interfejsie.
- [ ] Kolory protokołów zdefiniowane w jednym miejscu.
- [ ] Kontrast tekstu ≥ 4,5:1 na wszystkich panelach.
