import type { Translations } from "../types";

export const pl: Translations = {
  common: {
    gameRules: "Zasady gry",
    copied: "Skopiowano!",
    copyCode: "Kopiuj kod",
    room: "POKÓJ",
    close: "Zamknij",
    host: "HOST",
    you: "TY",
    player: "Gracz",
    opponent: "Przeciwnik",
    operator: "Operator",
    status: "STATUS",
  },
  lobby: {
    title: "OVERVOLT",
    subtitle:
      "Overvolt — cyberpunkowa gra blefu, zarządzania ryzykiem i przeciążeń obwodów.",
    operatorNick: "TWÓJ IDENTYFIKATOR (NICK):",
    roomCode: "KOD POKOJU:",
    roomCodePlaceholder: "NP. 7KQ4MZ2X",
    createTable: "STWÓRZ NOWY STÓŁ",
    createTableSub: "[INITIALIZE TABLE]",
    connectTable: "DOŁĄCZ DO STOŁU",
    connectTableSub: "[CONNECT TO TABLE]",
    waitingForPlayers: "Oczekiwanie na dołączenie graczy...",
    playersInLobby: "GRACZE PRZY STOLE:",
    ready: "GOTOWY",
    notReady: "NIEGOTOWY",
    toggleReady: "ZMIEŃ STATUS GOTOWOŚCI",
    startMatch: "ROZPOCZNIJ ROZGRYWKĘ",
    hostControls: "PANEL HOSTA",
    needReadyPlayers: "Wszyscy gracze muszą oznaczyć gotowość przed startem.",
    invitePrompt: "Kod Twojego pokoju to:",
    inviteHelp:
      "Wyślij ten kod lub link znajomym, aby dołączyli do Twojego stołu.",
    createTableDesc:
      "Rozpocznij nowy stół jako gospodarz (host). Kod pokoju zostanie wygenerowany automatycznie.",
    connectTableDesc:
      "Wpisz kod otrzymany od znajomego, aby zająć wolne miejsce przy stole.",
    howToPlayPrompt: "Nie wiesz jak grać? Otwórz szybki podręcznik zasad gry",
    youTag: "(TY)",
    readyYes: "TAK (ZMIEŃ)",
    markReady: "OZNACZ: GOTOWY",
  },
  home: {
    heroTagline: "Blefuj, ryzykuj i przetrwaj przeciążenie obwodów.",
    nicknameLabel: "Twój nick",
    nicknamePlaceholder: "Wpisz nick",
    createCta: "Stwórz stół",
    joinHeading: "Masz kod od znajomego?",
    joinCta: "Dołącz",
    characterHeading: "Wybierz postać",
    invite: "Zaproś",
    inviteShareTitle: "Overvolt",
    inviteShareText: "Dołącz do mojego stołu w Overvolt!",
    inviteCopied: "Link do stołu skopiowany.",
    inviteFailed: "Nie udało się skopiować linku.",
    inviteNicknameTitle: "Podaj nick",
    inviteNicknameHint: (roomCode) =>
      `Wpisz nick, żeby dołączyć do stołu ${roomCode}.`,
    inviteJoining: (roomCode) => `Dołączanie do stołu ${roomCode}…`,
    inviteCancel: "Anuluj",
    leaveTable: "Opuść stół",
    characterPickerTitle: "WYBIERZ POSTAĆ OPERATORA (CYBER-RIG 3D):",
    characterActive: "WYBRANY",
    characterTaken: "ZAJĘTY",
    avatarReady: "AWATAR 3D GOTOWY",
    leaveConfirm: "Opuścić stół?",
    leaveYes: "Tak",
    leaveNo: "Nie",
  },
  summary: {
    title: "KONIEC ROZGRYWKI",
    winnerLabel: "Zwycięzca",
    podiumTitle: "Klasyfikacja",
    youTag: "(TY)",
    roundsPlayed: "Rozegrane rundy",
    playersCount: "Liczba graczy",
    playAgain: "Zagraj ponownie",
    waitingForHost: "Czekamy, aż host rozpocznie rewanż...",
    leave: "Opuść stół",
    youWon: "WYGRAŁEŚ",
    youLost: (placement: number) => `PRZEGRAŁEŚ — miejsce #${placement}`,
    spectatingBadge: "OBSERWUJESZ",
    spectatorOverview: "Widok ogólny",
    spectatorCycle: "Przełącz operatora",
  },
  table: {
    targetProtocol: "WYMAGANY PROTOKÓŁ:",
    declaredAs: "DEKLAROWANY PROTOKÓŁ:",
    tablePile: "STOS KART NA STOLE",
    pileCount: "KART NA STOLE:",
    emptyPile: "STOS JEST PUSTY — WYŁÓŻ PIERWSZE PAKIETY",
    yourTurnTitle: "▶ TWÓJ RUCH!",
    yourTurnHelp:
      "Wybierz karty z ręki i wyłóż je jako deklarowany protokół, albo sprawdź poprzednika.",
    opponentTurn: "Ruch gracza:",
    spectatorAlert:
      "⚡ AWARIA DIELEKTRYKA: TWÓJ KONDENSATOR ULEGŁ ZWARCIU. TRYB OBSERWATORA.",
    packetSnifferAlert: "PRZECHWYCONY PAKIET POPRZEDNIKA:",
    noPackets: "BRAK PAKIETÓW W BUFORZE",
    myHandTitle: "TWOJE KARTY // DOSTĘPNE PAKIETY:",
    packetsCount: "pakietów",
    transmitCards: "WYŁÓŻ KARTY",
    callTrace: "SPRAWDŹ BLEF (CALL TRACE)",
    callTraceHelp: "Oskarż poprzednika o wyłożenie nieprawidłowych kart.",
    mustCallTrace: "Rywale nie mają już kart — musisz sprawdzić blef.",
    selectCardsPrompt: "Wybierz przynajmniej jedną kartę z ręki",
    matchCard: "ZGODNA",
    wildCard: "DZIKA KARTA",
    bluffCard: "BLEF",
    playAgain: "ZAGRAJ PONOWNIE (REWANŻ)",
    nextRound: "ROZPOCZNIJ KOLEJNĄ RUNDĘ",
    matchWon: "ROZGRYWKA ZAKOŃCZONA: PRZETRWAŁ",
    matchOverDesc:
      "Wszyscy pozostali operatorzy ulegli zniszczeniu przez przeciążenie kondensatorów.",
    claimedAsTarget:
      "(Wszystkie zagrywane karty deklarujesz jako wymagany protokół)",
    waitYourTurn: "Poczekaj na swoją kolej",
    noCardsOnTable: "Brak kart na stole do sprawdzenia",
    confidential: "[POUFNE // TYLKO TWÓJ EKRAN]",
    busEncrypted: "MAGISTRALA ZASZYFROWANA",
  },
  chips: {
    packetSniffer: "SNIFFER PAKIETÓW",
    packetSnifferDesc:
      "Podgląda 1 losową kartę z ostatniego zagrania przeciwnika.",
    empFlare: "ROZBŁYSK EMP",
    empFlareDesc:
      "Czyści stos kart ze stołu i pozwala zmienić deklarowany protokół.",
    overclockInjector: "INJEKTOR PRZETAKTOWANIA",
    overclockInjectorDesc:
      "Skraca limit czasu tury aktywnego przeciwnika do 5 sekund.",
    groundWire: "PRZEWÓD UZIEMIAJĄCY",
    groundWireDesc:
      "Zmniejsza ryzyko przebicia kondensatora o połowę przed testem.",
    burned: "SPALONY",
    installed: "ZAINSTALOWANY",
    socketEmpty: "GNIAZDO PUSTE",
  },
  voltage: {
    modalTitle: "TEST WYSOKIEGO NAPIĘCIA KONDENSATORA",
    criticalOverload: "KRYTYCZNE PRZECIĄŻENIE // PRZEBICIE KONDENSATORA",
    dischargeComplete: "ROZŁADOWANIE ZAKOŃCZONE POMYŚLNIE",
    targetOperator: "TESTOWANY OPERATOR:",
    impendingText:
      "Magistrala wysokiego napięcia uzbrojona. Wyładowanie nieuniknione.",
    triggerDischarge: "WYKONAJ ROZŁADOWANIE TESTOWE",
    useGroundWire: "UŻYJ PRZEWODU UZIEMIAJĄCEGO (-50% RYZYKA)",
    dismiss: "ZAMKNIJ",
    rollResult: "WYNIK RZUTU D6",
    testedRisk: "TESTOWANY POZIOM RYZYKA",
    stabilizedDesc: "DIELEKTRYK WYTRZYMAŁ // UKŁAD ZESTABILIZOWANY",
    overloadDesc: "PRZEBICIE KONDENSATORA // OPERATOR ZNISZCZONY",
    pendingSelfAlert: "⚡ TEST WYSOKIEGO NAPIĘCIA: TWÓJ RIG JEST POD NAPIĘCIEM",
    pendingOpponentAlert:
      "⚡ TEST WYSOKIEGO NAPIĘCIA: OPERATOR POD NAPIĘCIEM...",
  },
  intermission: {
    roundOverTitle: "KONIEC RUNDY",
    operatorsAlive: "W GRZE",
    survivedAttempt: "PRZETRWAŁ TEST KONDENSATORA",
    riskIncreased: "POZIOM RYZYKA WZRASTA DO",
    operatorEliminated: "OPERATOR WYELIMINOWANY Z OBWODU",
    nextCycleAuto: "START KOLEJNEGO CYKLU ZA",
    spectatorModeNotice: "ZOSTAŁEŚ WYELIMINOWANY // TRYB OBSERWATORA",
    fallbackStart: "WYMUŚ START RUNDY",
    breakdownDesc: "Przebicie dielektryka. Obwód otwarty.",
    dischargeResolving: "Trwa rozładowanie...",
  },
  arena: {
    hologramProtocol: "PROTOKÓŁ",
    hologramPile: "STOS",
    hologramYourTurn: "TWÓJ RUCH",
    hologramTurnOf: "RUCH",
    overloadTitle: "⚡ KRYTYCZNE PRZECIĄŻENIE // UTRATA SYGNAŁU",
    overloadSub: "OBRAZ PRZEKIEROWANY NA DRONA OBSERWATORA",
    visorBlackout: "UTRATA SYGNAŁU // BLACKOUT",
    visorTransmitting: ">>> NADAJE <<<",
    visorLocked: "ZABLOKOWANY",
    visorHighVoltage: "⚡ RDZEŃ WYSOKIEGO NAPIĘCIA ⚡",
    visorSynthesis: "SYNTEZA // ŁĄCZE NEURONOWE",
    cardReady: "▲ GOTOWA DO ZAGRANIA ▲",
    cardSelectHint: "KLIKNIJ ABY WYBRAĆ",
    cardBack: "ZASZYFROWANY PAKIET",
  },
  hud: {
    turnTimer: "CZAS TURY",
    dischargeTimer: "CZAS NA ROZŁADOWANIE",
    yourTurnBanner: "TWÓJ RUCH",
    opponentTurnBanner: "Ruch gracza",
    empPickerTitle: "EMP FLARE // NOWY PROTOKÓŁ",
    empPickerHint: "Wyczyść stos i wybierz nowy protokół docelowy:",
    empPickerCurrent: "obecny",
    empPickerCancel: "Anuluj",
    chipLabel: "CHIP",
    cameraPov: "POV",
    cameraTable: "STÓŁ",
    cameraRivals: "RYWALE",
    secondsShort: "s",
    hurryUp: "KOŃCZY SIĘ CZAS",
    roundIntroTitle: (round) => `RUNDA ${round}`,
    roundIntroProtocol: "PROTOKÓŁ",
    roundIntroHint: "Zagrywaj karty tego protokołu — albo blefuj.",
    muteAudio: "Wycisz dźwięk",
    unmuteAudio: "Włącz dźwięk",
    muteVoice: "Wyłącz głosy robotów",
    unmuteVoice: "Włącz głosy robotów",
    gfxHigh: "FX: WYSOKA",
    gfxLow: "FX: NISKA",
    gfxToggleTooltip: "Przełącz jakość grafiki",
  },
  voice: {
    playCards: (count: number, protocol: string) => {
      const p = protocol.toLowerCase();
      if (p === "alpha") {
        if (count === 1) return "jedna alfa";
        if (count === 2) return "dwie alfy";
        if (count === 3) return "trzy alfy";
        return `${count} alfy`;
      }
      if (p === "beta") {
        if (count === 1) return "jedna beta";
        if (count === 2) return "dwie bety";
        if (count === 3) return "trzy bety";
        return `${count} bety`;
      }
      if (p === "gamma") {
        if (count === 1) return "jedna gamma";
        if (count === 2) return "dwie gammy";
        if (count === 3) return "trzy gammy";
        return `${count} gammy`;
      }
      if (p === "glitch") {
        if (count === 1) return "jeden glitch";
        if (count === 2) return "dwa glitche";
        if (count === 3) return "trzy glitche";
        return `${count} glitche`;
      }
      if (p === "corrupted") {
        if (count === 1) return "jeden corrupted";
        if (count === 2) return "dwa corrupted";
        if (count === 3) return "trzy corrupted";
        return `${count} corrupted`;
      }
      return `${count} ${protocol}`;
    },
    liar: "KŁAMCA!",
    eliminated: "system... offline",
    win: "zwycięstwo protokołu",
  },
  verdict: {
    bluffDetected: "BLEF WYKRYTY",
    cleanTransmission: "CZYSTA TRANSMISJA",
    loserVoltageTest: (nickname) => `${nickname} idzie na test napięcia`,
    youVoltageTest: "TY idziesz na test napięcia",
    traceTitle: "CALL TRACE",
    traces: "SPRAWDZA",
    you: "TY",
    claim: (count, protocol) =>
      `deklaracja: ${count}× ${protocol.toUpperCase()}`,
    scanning: "SKANOWANIE KART…",
    showdownTitle: "SPRAWDZENIE BLEFU",
    voltageTitle: "TEST NAPIĘCIA",
    steps: ["SPRAWDZENIE", "WERDYKT", "TEST NAPIĘCIA", "WYŁADOWANIE"],
    roleAccused: "SPRAWDZANY",
    tagToTest: "NA TEST NAPIĘCIA",
    tagSafe: "BEZPIECZNY",
    bluffReason: (bluffCount, total, protocol) =>
      `${bluffCount} z ${total} kart to nie ${protocol.toUpperCase()}`,
    cleanReason: (protocol) =>
      `wszystkie karty pasują do ${protocol.toUpperCase()}`,
    deciding: (nickname) => `${nickname} decyduje…`,
    yourDecision: "TWOJA DECYZJA",
    awaiting: "UZBRAJANIE KONDENSATORA…",
    skipHint: "SPACJA / DOTKNIJ, ABY POMINĄĆ",
    groundWireShort: "UZIEMIENIE −50%",
    dischargeShort: "ROZŁADUJ",
  },
  discharge: {
    charging: "ŁADOWANIE KONDENSATORA",
    rolling: "RZUT K6",
    rule: (risk) => `zwarcie przy wyniku ≤ ${risk}`,
    held: "IZOLACJA WYTRZYMAŁA",
    shorted: "ZWARCIE // ELIMINACJA",
    riskNow: (risk) => `ryzyko teraz ${risk}/6`,
  },
  controls: {
    hotkeysTitle: "SKRÓTY KLAWISZOWE",
    hotkeysCards: "Zaznacz / odznacz kartę z ręki",
    hotkeysTransmit: "Wyślij zaznaczone karty",
    hotkeysTrace: "Sprawdź blef",
    hotkeysChip: "Użyj chipa",
    hotkeysClear: "Odznacz karty / zamknij okno",
    hotkeysHelp: "Pokaż / ukryj tę ściągawkę",
    hotkeysClose: "Zamknij",
    firstTurnHint: "Zaznacz 1–3 karty, a następnie wyślij je.",
    firstTurnDismiss: "Rozumiem",
    legendMatch: "zgodna",
    legendWild: "dzika",
    legendBluff: "blef",
  },
  rules: {
    modalTitle: "ZASADY GRY // OVERVOLT",
    shortSummary:
      "Cyberpunkowa gra blefu i zarządzania ryzykiem oparta o mechanikę Oszusta (Liar's Dice / Cheat).",
    coreGoalTitle: "1. Cel rozgrywki",
    coreGoalText:
      "Pozbądź się wszystkich swoich kart lub doprowadź do sytuacji, w której wszyscy przeciwnicy odpadną przez przeciążenie swoich kondensatorów.",
    step1Title: "2. Wymagany protokół i zagrywanie",
    step1Text:
      "W każdej turze obowiązuje Wymagany Protokół (Alpha, Beta, Gamma, Delta). Zagrywasz 1 do 3 kart koszulką do góry, twierdząc, że wszystkie odpowiadają temu protokołowi.",
    step2Title: "3. Prawda czy blef?",
    step2Text:
      "Możesz mówić prawdę (wykładać zgodne karty lub dziką kartę GLITCH) albo bezczelnie blefować, wykładając zupełnie inne karty.",
    step3Title: "4. Sprawdzenie blefu (Call Trace)",
    step3Text:
      "Kolejny gracz zamiast wykładać karty może wcisnąć SPRAWDŹ BLEF. Odkrywane są ostatnio wyłożone karty. Jeśli gracz blefował – jego kondensator ładuje się! Jeśli mówił prawdę – to oskarżyciel otrzymuje ładunek do kondensatora.",
    step4Title: "5. Przebicie dielektryka (Eliminacja)",
    step4Text:
      "Każdy otrzymany ładunek zwiększa ryzyko wyładowania. Podczas testu napięcia kość rozstrzyga, czy kondensator wytrzyma. Przeciążenie oznacza natychmiastowe zwarcie i odpadnięcie z gry!",
    specialCardsTitle: "6. Karty Specjalne w Talii",
    specialCardsDesc:
      "Talia zawiera pakiety standardowe oraz dwa kluczowe typy kart specjalnych:",
    glitchCardTitle: "GLITCH [!] (OVERRIDE // DZIKA KARTA)",
    glitchCardDesc:
      "Karta uniwersalna (joker). Zawsze pasuje do każdego wymaganego protokołu (Alpha, Beta, Gamma). Jeśli przeciwnik sprawdzi Twoje zagranie (Call Trace), Glitch jest traktowany jako w 100% poprawna karta — oskarżyciel przegrywa test i to on ładuje kondensator!",
    corruptedCardTitle: "CORRUPTED [X] (USZKODZONY PAKIET // WIRUS)",
    corruptedCardDesc:
      "Karta o zerowej integralności sygnału. Nie pasuje do żadnego protokołu. Każde jej wyłożenie to ZAWSZE blef! Twoim celem jest pozbycie się jej z ręki tak sprytnie, by nikt nie odważył się Ciebie sprawdzić.",
    standardCardsTitle: "ALPHA [A], BETA [B], GAMMA [G] (KARTY BAZOWE)",
    standardCardsDesc:
      "Standardowe pakiety protokołów magistrali. Są zgodne z prawdą wyłącznie wtedy, gdy na stole obowiązuje ich identyczny protokół.",
    chipsTitle: "7. Chipy Akcji (Moduły Exploit DIP-8)",
    chipsSubtitle:
      "Każdy gracz posiada unikalny jednorazowy chip, który można aktywować w trakcie pojedynku:",
    snifferChipDesc:
      "SN74-SNIFF // SNIFFER: Podejrzyj 1 losową kartę z ostatniego zagrania rywala. Sprawdź, czy mówił prawdę przed wykonaniem ruchu.",
    empChipDesc:
      "SN74-FLARE // ROZBŁYSK EMP: Czyści cały stos kart na stole do zera i natychmiast narzuca nowy wybrany przez Ciebie protokół docelowy.",
    overclockChipDesc:
      "SN74-INJ // INJEKTOR: Przerywa turę przeciwnika i skraca jego limit czasu do zaledwie 5 sekund, wymuszając błąd pod presją.",
    groundChipDesc:
      "SN74-GND // UZIEMIENIE: Aktywowane przed wyładowaniem kondensatora. Obniża poziom ryzyka awarii o 50% przed rzutem kością.",
    close: "ZAMKNIJ PRZEWODNIK",
    wildTag: "DOWOLNA",
    bluffOnlyTag: "TYLKO BLEF",
  },
  network: {
    connecting: "Łączenie…",
    reconnecting: "Ponowne łączenie…",
    disconnected: "Rozłączono",
    connectionError: "Błąd połączenia z serwerem",
    reconnectFailed: "Nie udało się wrócić do pokoju. Dołącz ponownie.",
    sessionExpired: "Sesja wygasła. Wróć do lobby.",
    contractViolation: "Otrzymano nieprawidłowe dane z serwera",
    actionFailed: (action, detail) =>
      `Akcja nie powiodła się (${action}): ${detail}`,
    dismiss: "Zamknij",
  },
  feed: {
    title: "ZDARZENIA",
    you: "Ty",
    unknownPlayer: "Nieznany",
    exploits: {
      PacketSniffer: "SNIFFER",
      GroundWire: "UZIEMIENIE",
      OverclockInjector: "OVERCLOCK",
      EmpFlare: "EMP FLARE",
    },
    played: (who, count, protocol) => `${who} zagrywa ${count}× ${protocol}`,
    traceCalled: (who, target, bluff) =>
      `${who} sprawdza ${target} — ${bluff ? "BLEF!" : "czysto"}`,
    exploitUsed: (who, exploit) => `${who} używa ${exploit}`,
    survived: (who, roll) => `${who} przeżywa wyładowanie (rzut ${roll})`,
    overloaded: (who, roll) => `${who} przeciążony! (rzut ${roll})`,
    eliminated: (who, placement) => `${who} wyeliminowany — #${placement}`,
    roundStarted: (round, protocol) =>
      protocol
        ? `Runda ${round} rozpoczęta — protokół ${protocol}`
        : `Runda ${round} rozpoczęta`,
  },
};
