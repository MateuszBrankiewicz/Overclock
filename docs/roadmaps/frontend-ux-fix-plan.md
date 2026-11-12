# Frontend UX — Fix Plan (Dead Circuit)

> Status: **Draft** · Utworzono: 2026-11-12 · Gałąź bazowa: `feat/3d-bunker-arena-death-kinematics`
>
> Wynik przeglądu frontendu (React 19 + R3F) pod kątem bugów UI i zaangażowania gracza.
> Kontekst architektoniczny: [ADR 0003](../adr/0003-realtime-engine-signalr-and-state-machine.md),
> [ADR 0009](../adr/0009-voltage-test-hardware-exploits-and-timing-windows.md),
> [ADR 0010](../adr/0010-webgl-3d-bunker-arena-character-selection-and-mobile-first-viewport.md),
> [frontend guidelines](../architecture/frontend-guidelines.md).

Główny wniosek: przejście na pełnoekranowy widok 3D (ADR 0010) zgubiło część mechanik z widoku 2D,
a błędy i stan sieci nie są w ogóle komunikowane graczowi w trakcie meczu.

---

## Faza 1 — Krytyczne bugi (czysty frontend, bez nowych ADR)

- [ ] **B1. Brak licznika czasu tury.**
  `turnDeadlineUtc` / `remainingTimeSeconds` są w store, ale nic ich nie renderuje.
  `TurnBanner`, `TablePile`, `OpponentSeats`, `VoltageTestSequence`, `CapacitorMeter` są osierocone
  (używane tylko w testach). Efekt `OverclockInjector` (skrócenie tury do 5 s) jest niewidoczny.
  → Dodać licznik (pierścień przy hologramie stołu lub pasek HUD) liczony z `turnDeadlineUtc`,
  czerwony + puls w ostatnich 5 s. To samo dla `dischargeDeadlineUtc` w teście napięcia.
  Zdecydować: podpiąć ponownie czy usunąć osierocone komponenty.

- [ ] **B2. EMP Flare nie pozwala wybrać protokołu (regresja ADR 0009).**
  `BunkerArenaCanvas.tsx` (przycisk `CHIP:`) i `PovHandAndControls3D.tsx` (gniazdo 3D) wysyłają
  `currentTargetProtocol ?? 'Alpha'`. Wybór Alpha/Beta/Gamma istnieje tylko w nieużywanym `ExploitChipSlot`.
  → Popover z wyborem protokołu dla `EmpFlare`; pozostałe exploity bez zmian.

- [ ] **B3. Po automatycznym reconnect SignalR gracz przestaje dostawać eventy.**
  `onReconnected` w `frontend/src/features/game/hooks/useDebugTerminal.ts` tylko ustawia status —
  nowe `connectionId` nie wraca do grupy pokoju. → Po `onReconnected` wywołać hub `Reconnect`
  z zapisaną sesją i zastosować snapshot.

- [ ] **B4. Odświeżenie strony (F5) wyrzuca z gry.**
  Sesja jest w `sessionStorage`, ale `reconnect()` jest dostępne tylko ręcznie w Debug Terminalu.
  → Auto-reconnect przy starcie aplikacji, jeśli istnieje zapisana sesja (z fallbackiem do lobby).

- [ ] **B5. Błędy akcji w grze są niewidoczne.**
  `PlayCards/CallTrace/ActivateExploit/TriggerDischarge failed` trafiają tylko do `lastLog`,
  który jest renderowany wyłącznie na ekranie lobby. → System toastów (Zustand slice lub lokalny
  store UI) + status połączenia (Reconnecting/Disconnected) widoczny w HUD.

## Faza 2 — Bugi średnie / jakość

- [ ] **B8. Przeciąganie kamery.** `onPointerDown/Move` na całym stage łapie kliknięcia przycisków i kart;
  `setYawOffset/setPitchOffset` przy każdym ruchu myszy re-renderuje całe drzewo `<Canvas>`.
  → Przenieść offsety do `useRef`, próg martwej strefy przed rozpoczęciem dragu, ignorować eventy z przycisków.
  `pitchOffset` jest ignorowany w trybach `table` / `opponents` — ujednolicić.

- [ ] **B9. i18n — twarde stringi i mieszanie języków.**
  - Hologram w `TableCenterpiece3D.tsx` zawsze po polsku („PROTOKÓŁ”, „STOS”, „TWÓJ RUCH”).
  - Tylko po angielsku: „CRITICAL OVERLOAD // SIGNAL LOST”, „FEED REDIRECTED TO SPECTATOR DRONE”,
    „CHIP:”, title „Leave Table”, „Dielectric breakdown occurred…”, „Discharge sequence resolving…”,
    teksty w `ExploitChipSlot`, fallbacki `'Player'` / `'Opponent'` / `'YOU'` / `'Operator'`.
  - Przyciski typu `[Utwórz stół // INITIALIZE TABLE]` mieszają PL+EN.
  - `language === 'pl' ? 'POV' : 'POV'` w `BunkerArenaCanvas.tsx` → przenieść do słownika.

- [ ] **B10. Drobne:**
  - Nick losowany przy każdym wejściu (`Player_NNN`) — zapamiętywać w `localStorage` jak postać.
  - Enter nie zatwierdza formularzy lobby (brak `<form>`).
  - „Utwórz stół” wysyła kod wpisany w polu *dołączania* jako custom kod pokoju — rozdzielić pola.
  - `GameRulesModal` renderowany podwójnie (`App.tsx` i `OperatingTable.tsx`).
  - Host wychodzi podczas przerwy → pozostali utkną na liczniku 0 s (brak fallbacku dla nie-hosta).
  - Header/footer `App.tsx` renderują się pod pełnoekranowym stołem — ukryć w trakcie gry.
  - Opuszczenie stołu bez potwierdzenia — dodać confirm wbudowany w UI.

## Faza 3 — Zaangażowanie gracza („juice”)

- [ ] **U1. Baner „TWÓJ RUCH”** przy starcie tury (slide-in/out ~1.2 s) + podświetlenie aktywnego przeciwnika.
- [ ] **U2. Feed zdarzeń** w rogu HUD: „Volt zagrał 2× ALPHA”, „Ghost wzywa TRACE!”, „Proxy użył EMP FLARE”.
- [ ] **U3. Toasty** (wspólne z B5).
- [ ] **U4. Skróty klawiszowe:** `1–9` karta, `Enter`/`Space` wyślij, `T` trace, `E` chip, `Esc` odznacz + ściągawka.
- [ ] **U5. Animacja lotu kart** z ręki na stos (keyframe `cardFlight` w `index.css` jest nieużywany; w 3D — tween w R3F).
- [ ] **U6. Rzut kością D6** w teście napięcia zamiast samego wyniku na badge’u.
- [ ] **U7. Wibracje** na mobile (`navigator.vibrate`) przy porażeniu / eliminacji.
- [ ] **U8. Podpowiedź pierwszej tury** („zaznacz 1–3 karty”) + czytelniejsze oznaczenie match/wild/bluff w ręce.
- [ ] **U9. Ekran startowy:** klimatyczny hero (nieużywany `assets/hero.png`), jedno główne CTA,
  usunięcie technicznych napisów (`NETARCHTEST + TESTCONTAINERS + ORVAL`, `SYS.VER`) z UI gracza.
- [ ] **U10. Zaproszenia:** po utworzeniu pokoju ustawić `?room=KOD` w URL; jeden przycisk „Zaproś”
  (Web Share API na mobile, kopiowanie linku na desktop).
- [ ] **U11. Ekran końca meczu:** podium wg `PlayerEliminated.placement`, krótkie statystyki, „Zagraj ponownie”.
- [ ] **U12. Wydajność:** `frameloop="demand"` / throttling w lobby; offsety kamery na refach (B8).

## Faza 4 — Wymaga ADR przed implementacją (AGENTS.md §1)

- [ ] **B6. Serwerowe opuszczenie pokoju.** `leaveRoom()` czyści tylko lokalny store — brak wywołania huba
  i `clearSession()`. Nowa metoda hub `LeaveRoom` = zmiana protokołu SignalR → **ADR**.
  (`clearSession()` po stronie klienta można zrobić od razu w Fazie 2.)
- [ ] **B7. Synchronizacja wybranej postaci.** `characterByPlayerId` jest tylko lokalny; przeciwnicy widzą
  postać wyliczoną z hasha ID (różnie na każdym kliencie, możliwe duplikaty). Pole postaci w `PlayerSeat`
  / komenda hub → zmiana kontraktu → **ADR** + aktualizacja fixtures w `tests/contracts/signalr/`.
- [ ] **U13. Dźwięk.** Hum tła, klik kart, syrena TRACE, narastający brzęczyk testu napięcia, trzask wyładowania,
  przycisk mute. Web Audio API bez zależności — bez ADR; biblioteka (np. howler) — **ADR** (nowa zależność).

---

## Kolejność realizacji (proponowana)

1. Faza 1 (B1–B5) + U1, U3, U4 — jeden commit na spójną zmianę, np.
   `fix(frontend): restore turn timer and EMP flare protocol picker (ADR 0009, ADR 0010)`.
2. Faza 2 (B8–B10).
3. Faza 3 (pozostałe U*).
4. Drafty ADR dla B6, B7 (i ewentualnie U13) → implementacja po akceptacji.

Każdy krok: `bash scripts/verify.sh --fast` w pętli, `bash scripts/verify.sh` przed commitem,
testy Vitest dla nowych komponentów/store’u.
