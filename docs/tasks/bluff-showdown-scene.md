# Zadanie: scena sprawdzenia blefu i testu napięcia („showdown")

Status: do zrobienia · Zakres: wyłącznie `frontend/` · Gałąź: `fix/home-and-table-ux`

## 1. Cel

Sprawdzenie blefu (CALL TRACE) i test napięcia to kulminacja każdej rundy. Dziś wygląda to jak
kilka przypadkowych banerów nad sceną 3D. Po tym zadaniu ma to być **wyreżyserowana scena w 3D**,
z której bez czytania tekstu wiadomo: kto kogo sprawdza, co było zadeklarowane, co faktycznie
leżało na stole, kto przegrał, jakie ma ryzyko, co wypadło na kości i czy przeżył.

Zasada nadrzędna: **informację niesie scena 3D (kamera, światło, karty, bęben), a 2D tylko ją
podpisuje**. Jeśli coś da się pokazać w 3D, nie dokładamy tekstu.

## 2. Co jest dziś źle (zaobserwowane na zrzutach z gry)

1. Wywołanie sprawdzenia nie ma „uderzenia" — pojawia się mały box i cienka żółta kreska
   (`TraceDuelBeam3D`) między graczami.
2. Karty odkrywają się poza kadrem: leżą płasko na dole ekranu (`RevealedCards3D`, pozycja
   `[x, 0.82, 0.15]`), a kamera patrzy na sprawdzanego.
3. Werdykt to tylko napis; scena na niego nie reaguje. Po odkryciu na stole zostaje pusta
   czerwona belka.
4. Test napięcia jest nieczytelny: bęben (`capacitorDrumRef` w `TableCenterpiece3D`) wyjeżdża
   i świeci, ale nie widać komór, poziomu ryzyka ani wyniku rzutu — to wszystko było tylko
   w tekście banera.
5. W trakcie sekwencji na ekranie zostawały elementy tury: pigułka „STOS: 0 • TWÓJ RUCH",
   wyszarzony pasek akcji, hint pierwszej tury, licznik w lewym górnym rogu.

## 3. Stan wyjściowy w repo (niezacommitowany WIP)

W drzewie roboczym jest częściowa praca. `scripts/verify.sh --fast` przechodzi (10 PASS).
**Nowy panel nie był jeszcze oglądany w przeglądarce** — pierwszym krokiem jest zrobienie zrzutów
(sekcja 7) i ocena.

Zostaje (logika i sprzątanie, na tym budujemy):

- `utils/outcomePhase.ts` — trwająca animacja rozładowania ma pierwszeństwo przed `decision`
  (wcześniej baner rzutu nakładał się na kontrolki decyzji, gdy snapshot się spóźniał).
- Store: nowe pole `showdownTrace` (`stores/types.ts`, `createTurnSlice.ts`,
  `createRoomSlice.ts`, `helpers/startTraceReveal.ts`) — rozstrzygnięcie trace'a trzymane przez
  całą sekwencję, czyszczone w `clearDischargeCinematic`, `clearAwaitingDischarge`,
  `applyRoundStarted`, `resetGame`, `leaveRoom` i przy snapshocie `TurnActive`/`Lobby`.
- `OperatingTable.tsx` — `isShowdown = reveal | decision | discharge`; przez cały ten czas
  ukryte są: ręka, pasek akcji, legenda kart, pigułka stosu, `PhaseTimers`, `FirstTurnHint`,
  `SpectatorHud`.
- `components/RigAvatarSvg.tsx` — portret postaci wydzielony z `CharacterSelector`.
- Nowe klucze i18n w `t.verdict.*` (PL i EN) w `shared/i18n/useI18n.ts`.

Do przerobienia:

- `components/showdown/BluffShowdown.tsx` (+ `showdownParts.tsx`, `showdownTheme.ts`) — duży
  panel 2D na dole ekranu, który zastąpił `TraceVerdictBanner`, `DischargeSequenceBanner`
  i `VoltageControls`. Ma zostać **odchudzony do wąskiej belki** (sekcja 6); karty, komory
  i kość mają żyć w 3D, nie w panelu.

Braki do uzupełnienia:

- Usunięte zostały testy `TraceVerdictBanner.test.tsx` i `DischargeSequenceBanner.test.tsx` —
  ich asercje trzeba przenieść na nowe komponenty (sekcja 8). Nie wolno ich po prostu pominąć.
- `BunkerArenaCanvas.test.tsx` — przypadek „tactile voltage test trigger button" przekazuje
  usunięte propsy (`isVoltageTestActive`, `isLocalPlayerPending`, …); przenieść asercję `D6`
  na poziom `OperatingTable` / belki.
- `utils/outcomePhase.test.ts` — dodać przypadek `VoltageTest` + `hasDischargeCinematic` →
  `'discharge'`.

## 4. Twarde ograniczenia

- **Czas.** Od `TraceCalled` serwer daje przegranemu 5 s na decyzję (ADR 0009). Całe odkrycie
  (beaty 1–4) musi się kończyć najpóźniej ok. 3,7 s dla 3 kart — tyle trwa dziś
  (`TRACE_SUSPENSE_MS` 1000 + 260 ms na kartę + `REVEAL_VERDICT_HOLD_MS` 1700). Nie wydłużać
  sumy; można przesuwać czas między beatami. Wszystkie stałe tylko w `utils/cinematicTiming.ts`.
- **Brak spoilerów.** Dopóki dana karta nie jest odwrócona, nic (kolor, kamera, światło, DOM)
  nie może zdradzać werdyktu. Dziś pilnuje tego `useReachedAt` + `revealLoserPos`.
- **Reduced motion.** `prefersReducedMotion()` — bez wstrząsów kamery, błysków i zwolnień;
  stany końcowe pokazane od razu.
- **GFX low.** `useGfxSettings().quality === 'low'` — bez post-processingu; scena ma być
  czytelna także wtedy. Cząsteczki tylko przez istniejącą pulę (`vfx/particlePool`, 256 szt.).
- **Bez nowych zależności, bez zmian protokołu i backendu** (inaczej ADR — AGENTS.md §1).
- Stan gry tylko w Zustand (`useGameStore`), payloady SignalR tylko przez Zod, żadnych
  `eslint-disable` / `@ts-ignore` / `any`, nie ruszać `scripts/` ani testów architektury.
- Animacja per-klatka w `useFrame` na refach, bez `setState` co klatkę.
- Pominięcie spacją / tapnięciem (reveal i discharge) ma działać jak dotąd.

## 5. Scena — beat po beacie

Czasy liczone od `traceReveal.startedAtMs` (etap 1) i `dischargeCinematic.startedAtMs` (etap 2).

### Etap 1 — sprawdzenie blefu

| Beat | Okno | Co widać |
|---|---|---|
| 1. Uderzenie | 0–350 ms | Bunkier przechodzi w czerwony alarm, krótki „hit-stop", duży napis „SPRAWDZAM!" od strony oskarżającego, szybki najazd kamery na sprawdzanego. |
| 2. Skan | 350–1000 ms | Karty unoszą się ze stosu, stają pionowo na środku kadru, przodem do kamery; przejeżdża po nich płaszczyzna lasera. Reszta stołu przygaszona, reflektor na sprawdzanym. |
| 3. Odkrycie | 1000 ms + 260 ms/karta | Karty odwracają się po kolei, każda z własnym akcentem. |
| 4. Werdykt | po ostatniej karcie, 1700 ms | Stempel, zalanie sceny kolorem, wskazanie przegranego. |

Szczegóły wykonania:

- **Beat 1.** Nowy komponent `vfx/TraceImpact3D.tsx` albo rozszerzenie `TraceDuelBeam3D`:
  wiązka ma być gruba, „wystrzelona" od oskarżającego (rośnie od 0 do pełnej długości w ~150 ms),
  z pierścieniem namierzania zaciskającym się na sprawdzanym. Napis „SPRAWDZAM!" jako krótki
  overlay 2D (skala 1,6→1, 350 ms, potem znika) — tekst z `t.voice.liar` lub nowy klucz.
  Alarm: `stageAccentColor` w `BunkerArenaCanvas` już daje czerwień dla `BluffCheck`; dodać
  jednorazowy impuls jasności (pointLight nad stołem, zanik 300 ms). Kamera: krótki impuls
  w `CameraController` (dodatkowe 6–8% przybliżenia do `subjectPosition`, wygaszany).
- **Beat 2.** Przebudować `RevealedCards3D`: zamiast leżeć na `y = 0.82`, karty lecą do
  pozycji „prezentacji" — nad środkiem stołu, pionowo, zwrócone do kamery gracza, rozmiar taki,
  by 3 karty zajmowały ok. 35–40% szerokości kadru i **nie były zasłonięte przez belkę 2D**
  na dole. Laser: półprzezroczysta płaszczyzna (`meshBasicMaterial`, additive) przesuwająca się
  w osi X po rewersach. Przygaszenie: obniżyć intensywność głównego spotlightu stołu na czas
  reveal, zostawić reflektor na sprawdzanym.
- **Beat 3.** Obrót wokół osi Y (jak karta w ręku), nie „kładzenie". Po odwróceniu:
  zgodna — zielony puls ramki + iskry (`emitCardRevealSparks(..., false)`); joker — fioletowy;
  blef — czerwony, drgnięcie karty i mikro-wstrząs kamery (amplituda ≤ 0,02, 120 ms).
  Nad każdą odwróconą kartą duży znak ✓ / ★ / ✖ (sprite lub `Html`), czytelny z daleka.
  Ostatnia karta: obrót o 30% wolniejszy. Dźwięk: istniejące efekty, rosnący ton na kartę,
  jeśli da się to zrobić bez nowego silnika audio (`shared/lib/audio/effects.ts`).
- **Beat 4.** Kolor całej sceny: akcent i mgła na czerwono (blef) lub zielono (czysto) przez
  ~600 ms, potem powrót do bursztynu testu napięcia. Wiązka pojedynku gaśnie, w jej miejsce
  reflektor + pierścień na przegranym (`revealLoserPos` już istnieje — dziś steruje błyskawicą).
  Stempel „BLEF WYKRYTY" / „CZYSTA TRANSMISJA" jako overlay 2D wbity nad kartami (obrót −3°,
  podwójna ramka — gotowy w `RevealBody` w WIP). Karty zostają odkryte do końca beatu,
  potem opadają do stołu i znikają razem z wyjazdem bębna.

### Etap 2 — test napięcia

| Beat | Kiedy | Co widać |
|---|---|---|
| 5. Uzbrojenie | faza `decision` | Bęben wyjeżdża ze stołu z czytelnymi komorami; świecący kabel biegnie do przegranego. |
| 6. Decyzja | faza `decision`, do 5 s | Lont wypala się po kablu; testowany ma dwa przyciski. |
| 7. Ładowanie | 0–1200 ms | Komory zapalają się po kolei, narasta buczenie. |
| 8. Ruletka | 1200–2600 ms | Bęben zwalnia, wskaźnik zatrzymuje się na wyniku. |
| 9. Wynik | od 2600 ms | Uderzenie łuku i rozstrzygnięcie. |

Szczegóły wykonania:

- **Beat 5.** Bęben w `TableCenterpiece3D` ma dostać 6 wyraźnych komór z numerami 1–6
  (tekstura canvas jak w `pcbCardTexture.ts` albo `Text` z drei). Komory `1..riskLevel`
  świecą na czerwono (emissive), pozostałe są ciemne/niebieskawe. Ryzyko ma się zgadzać z
  `dischargeCinematic.event.riskLevel`, a przed rzutem z `riskLevel` siedzenia testowanego
  (po użyciu Ground Wire liczba czerwonych komór ma spaść na oczach graczy). Nowy komponent
  `vfx/VoltageCable3D.tsx`: emisyjna linia po blacie od bębna do siedzenia testowanego
  (pozycje z `seatHeadPos` / `seatLayouts` w `BunkerArenaCanvas`), z impulsami biegnącymi
  do gracza.
- **Beat 6.** Lont: jasny punkt jadący po kablu od gracza do bębna zgodnie z
  `dischargeDeadlineUtc` (ten sam czas co `useCountdown`). Kamera: dla obserwatorów powolny
  objazd o kilka stopni wokół testowanego; dla testowanego widok na bęben. Przyciski
  (uziemienie / rozładuj) tylko u testowanego, w belce 2D; pozostali widzą „X decyduje…".
- **Beat 7–8.** Animacja bębna już istnieje (linie ~150–190 `TableCenterpiece3D`: wznoszenie,
  rozpędzanie, wyhamowanie na `targetAngle`). Dodać nieruchomy wskaźnik (grot/szczelina) nad
  bębnem po stronie kamery oraz „tyknięcie" przy każdej mijanej komorze (krótki błysk komory
  pod wskaźnikiem, opcjonalnie klik audio). Zweryfikować, że komora pod wskaźnikiem po
  zatrzymaniu to faktycznie `roll` — dziś `targetAngle = -((roll - 1) * 2π) / 6`.
  Na ~250 ms przed końcem wyhamowania wyciszyć światła (cisza przed uderzeniem).
- **Beat 9.** Wylosowana komora rozbłyskuje i powiększa się. Przetrwał: łuk schodzi po kablu
  w stół, niebieski rozbłysk, licznik ryzyka na tabliczce gracza (`OperatorRig3D`, etykieta
  z `⚡ n/6`) podbija się z animacją skali. Zwarcie: istniejąca animacja śmierci
  (`deathPose.ts`, `OverloadVignette`, `emitOverloadSmoke`) — nie przerabiać, tylko zadbać,
  by łuk szedł po kablu do gracza. Istniejący pełnoekranowy błysk zostaje.

## 6. HUD 2D — jedna wąska belka

`BluffShowdown` odchudzić do belki u dołu ekranu (wysokość ≤ ~96 px desktop, ≤ ~120 px mobile):

- lewa strona: portret + nick oskarżającego, strzałka z plakietką „3× ALPHA", portret + nick
  sprawdzanego (po werdykcie przegrany podświetlony, wygrany przygaszony);
- prawa strona: stepper 4 kroków (`t.verdict.steps`);
- jedna linia opisu zależna od beatu: „skanowanie kart…" → powód werdyktu
  (`bluffReason` / `cleanReason`) → „X decyduje…" + pasek czasu → „rzut K6: 5 > 3 — izolacja
  wytrzymała, ryzyko teraz 4/6";
- przyciski decyzji tylko dla testowanego;
- podpowiedź pominięcia.

Z panelu wypadają: karty 2D, rząd komór i tocząca się kość — ich rolę przejmuje scena 3D.
Wyjątek: gdy WebGL jest niedostępny (`ArenaFallback`), belka pokazuje wersję rozszerzoną
z kartami i komorami (komponenty z `showdownParts.tsx` zostają do tego celu).

Zachować `data-testid`: `bluff-showdown` (+ `data-stage`), `trace-duel-line`,
`trace-verdict-title`, `trace-verdict-subtitle`, `discharge-result`, `discharge-timer`.

## 7. Jak to oglądać bez backendu

Dev server: `cd frontend && npx vite --port 3111` (jeśli port zajęty — serwer już działa).
Chromium jest w `/usr/bin/chromium`, Playwright w
`~/.local/share/mise/installs/playwright/latest/node_modules/`.

Skrypt Playwrighta wstrzykuje stan prosto do store'u aplikacji. Moduł store'u trzeba wziąć
z zasobów strony (Vite dokleja `?t=…`; import „gołej" ścieżki tworzy drugą instancję):

```js
const url = performance.getEntriesByType('resource')
  .map((e) => e.name).find((n) => /stores\/useGameStore\.ts/.test(n));
const { useGameStore } = await import(/* @vite-ignore */ url);
const s = useGameStore.getState();
s.applyRoomSnapshot({ roomCode: 'CYBER-7X9', state: 'TurnActive', hostId: ME, myPlayerId: ME,
  myHand: [...], seats: [...3 graczy...], tablePileCount: 2, currentTargetProtocol: 'Alpha',
  currentTurnPlayerId: ME, roundNumber: 2 });
s.applyTraceResolution({ accuserPlayerId, accusedPlayerId, loserPlayerId, revealedCards,
  declaredProtocol: 'Alpha', bluffDetected: true, sequenceNumber: 10 });
s.applyVoltageTestStarted({ type: 'VoltageTestStarted', roomCode, pendingPlayerId: loser,
  decisionDeadlineUtc: new Date(Date.now() + 5000).toISOString(), sequenceNumber: 11 });
// po zakończeniu odkrycia:
s.applyCapacitorDischarged({ type: 'CapacitorDischarged', roomCode, playerId: loser, roll: 5,
  riskLevel: 3, resultingRiskLevel: 4, overloaded: false, sequenceNumber: 12 });
```

Chromium uruchamiać z `--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`.
Renderowanie programowe jest wolne, więc zrzuty po `waitForTimeout` nie trafiają w beaty —
użyć `page.clock.install()` przed `goto` i przesuwać czas przez `page.clock.runFor(ms)`.

Obowiązkowe zrzuty (desktop 1366×768 i mobile 390×844), dla każdego beatu 1–9, w scenariuszach:
blef złapany (ja sprawdzam), czysta transmisja (sprawdzający przegrywa), ja jestem testowany
(z Ground Wire i bez), zwarcie z eliminacją, widok wyeliminowanego obserwatora.

## 8. Testy

- `components/showdown/BluffShowdown.test.tsx` (SSR `renderToString`, wzorzec jak
  `RoundIntermissionBanner.test.tsx`) — przenieść asercje usuniętych testów:
  kto kogo sprawdza i deklaracja widoczne przed werdyktem; werdykt i przegrany niewidoczne,
  dopóki karty są zakryte; „TY" dla lokalnego gracza; warianty blef / czysto w PL i EN;
  etapy `charge` / `roll` / `strike` bez spoilera wyniku przed uderzeniem; „ryzyko teraz n/6"
  tylko przy przetrwaniu; przyciski decyzji (`D6`, Ground Wire) tylko dla testowanego.
- `utils/outcomePhase.test.ts` — nowy przypadek priorytetu (sekcja 3).
- `stores/useGameStore.test.ts` / `traceCinematic.test.ts` — `showdownTrace` ustawiane przy
  starcie odkrycia i czyszczone po zakończeniu sekwencji oraz przy nowej rundzie.
- `utils/cinematicTiming.test.ts` — jeśli dojdą stałe beatów, test, że suma odkrycia dla
  3 kart nie przekracza obecnych 3,74 s.
- Czysta logika 3D (pozycje prezentacji kart, kąt bębna → komora pod wskaźnikiem, pozycja
  lontu z ułamka czasu) wydzielona do funkcji w `utils/` lub obok komponentu i testowana
  jednostkowo, jak `resolveCameraTarget.test.ts` i `deathPose.test.ts`.
- `OperatingTableSequence.test.tsx` musi nadal przechodzić bez zmian asercji.

## 9. Kolejność pracy i punkty kontrolne

1. Zrzuty obecnego WIP-u (sekcja 7), naprawa testów z sekcji 3 → commit porządkowy.
2. Odchudzenie belki 2D (sekcja 6) → zrzuty → **pokazać użytkownikowi**.
3. Etap 1, beaty 2–3 (prezentacja i odkrycie kart w 3D) → zrzuty → **pokazać**.
4. Etap 1, beaty 1 i 4 (uderzenie, werdykt, światło, kamera) → zrzuty → **pokazać**.
5. Etap 2, beaty 5–6 (komory, kabel, lont) → zrzuty → **pokazać**.
6. Etap 2, beaty 7–9 (wskaźnik, ruletka, wynik) → zrzuty → **pokazać**.
7. Przejście reduced motion, GFX low, mobile, fallback bez WebGL.

Każdy krok kończy się zielonym `bash scripts/verify.sh --fast` (dotnet z mise musi być pierwszy
w `PATH`: `export PATH="$HOME/.local/share/mise/dotnet-root:$PATH"`) i osobnym commitem
w konwencji Conventional Commits, np. `feat(frontend): stage trace reveal cards upright in 3d`.

## 10. Kryteria akceptacji

- Osoba, która nie zna gry, po obejrzeniu sekwencji bez dźwięku umie powiedzieć: kto sprawdzał,
  kto kłamał (albo że nie kłamał), kto poszedł na test, jakie miał ryzyko, co wypadło i czy
  przeżył.
- W żadnym momencie sekwencji na ekranie nie ma elementów tury ani dwóch nakładających się
  komunikatów; w 2D jest wyłącznie jedna belka (plus krótkie overlaye „SPRAWDZAM!" i stempel).
- Odkrywane karty i bęben są w kadrze i nie są zasłonięte przez HUD na desktopie ani mobile.
- Brak spoilerów przed odwróceniem kart i przed uderzeniem łuku.
- Łączny czas odkrycia nie dłuższy niż dziś; decyzja testowanego dostępna najpóźniej po 3,74 s.
- Reduced motion i GFX low działają i pozostają czytelne.
- `bash scripts/verify.sh` przechodzi; nowe zachowanie ma testy z sekcji 8.
