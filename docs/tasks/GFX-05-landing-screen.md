# GFX-05 — Ekran startowy spójny z areną

> ADR: brak ([ADR 0010](../adr/0010-webgl-3d-bunker-arena-character-selection-and-mobile-first-viewport.md), [ADR 0012](../adr/0012-synchronised-character-selection-via-playerseat-characterid.md))
> Zakres: frontend · Bez nowych zależności
> Zależy od: GFX-04 (prymitywy `HudPanel` / `HudButton`), opcjonalnie GFX-02
> Commit: `feat(frontend): immersive landing screen with operator preview (GFX-05)`

## Problem

`LobbyScreen.tsx` to formularz w ramce z nagłówkiem i stopką strony (`App.tsx`), bez związku z klimatem
gry. Wybór postaci siedzi między „utwórz pokój” a „dołącz”, a postaci nie widać w 3D przed wejściem.

## Kroki

1. **Tło**: pełnoekranowa scena areny w trybie pokazowym — pusty stół, kołysząca się lampa, powolny
   obrót kamery; `frameloop` ograniczony (np. 30 FPS lub `demand` + timer), pauza przy ukrytej karcie.
   Bez WebGL: obecne `hero.png` jako tło.
2. **Układ**: jeden panel po lewej / u dołu na mobile:
   pseudonim → wybór postaci → dwa równorzędne przyciski „Utwórz pokój” / „Dołącz” (pole kodu
   rozwija się po wybraniu „Dołącz”; gdy w URL jest `?room=`, od razu otwarte i wypełnione).
3. **Podgląd postaci**: wybrany operator (`OperatorRig3D`) siedzi przy stole naprzeciw kamery,
   zmiana postaci = krótkie przejście (zanik wizjera, zmiana kolorów). Po kliknięciu postać
   wypowiada kwestię powitalną (`speakRobotVoice`, jeśli głos włączony).
4. **Chrome**: usuń nagłówek i stopkę strony z `App.tsx` na ekranie startowym; zasady, język
   i terminal debug przenieś do dyskretnego paska w rogu (te same kontrolki co w grze).
5. **Wejście do pokoju**: przejście kamery z widoku pokazowego do miejsca gracza zamiast twardego
   przełączenia widoku.
6. Stan wyboru postaci pozostaje w `useGameStore`; komponenty tylko wyświetlają.
7. Testy: `LobbyScreen` — pole kodu wypełnione z `?room=`, zablokowany przycisk bez kodu,
   fallback bez WebGL renderuje formularz.
8. `bash scripts/verify.sh --fast`.

## Kryteria akceptacji

- [x] Ekran startowy i stół wyglądają jak ta sama gra.
- [x] Wybraną postać widać w 3D przed wejściem do pokoju.
- [x] Na telefonie cały formularz mieści się bez przewijania (360×740).
- [x] Bez WebGL ekran nadal działa.
