import { create } from 'zustand';

export type Language = 'pl' | 'en';

export interface Translations {
  common: {
    appTitle: string;
    gameRules: string;
    copied: string;
    copyCode: string;
    room: string;
    status: string;
    close: string;
    host: string;
    you: string;
    player: string;
    opponent: string;
    operator: string;
  };
  lobby: {
    title: string;
    subtitle: string;
    operatorNick: string;
    roomCode: string;
    roomCodePlaceholder: string;
    createTable: string;
    createTableSub: string;
    connectTable: string;
    connectTableSub: string;
    waitingForPlayers: string;
    playersInLobby: string;
    ready: string;
    notReady: string;
    toggleReady: string;
    startMatch: string;
    hostControls: string;
    needReadyPlayers: string;
    invitePrompt: string;
    inviteHelp: string;
    createTableDesc: string;
    connectTableDesc: string;
    howToPlayPrompt: string;
    youTag: string;
    readyYes: string;
    markReady: string;
  };
  home: {
    heroTagline: string;
    nicknameLabel: string;
    nicknamePlaceholder: string;
    createCta: string;
    joinHeading: string;
    joinCta: string;
    characterHeading: string;
    invite: string;
    inviteShareTitle: string;
    inviteShareText: string;
    inviteCopied: string;
    inviteFailed: string;
    leaveTable: string;
    characterPickerTitle: string;
    characterActive: string;
    characterTaken: string;
    avatarReady: string;
    leaveConfirm: string;
    leaveYes: string;
    leaveNo: string;
    footer: string;
    debugToggle: string;
    backToGame: string;
  };
  summary: {
    title: string;
    winnerLabel: string;
    podiumTitle: string;
    youTag: string;
    roundsPlayed: string;
    playersCount: string;
    playAgain: string;
    waitingForHost: string;
    leave: string;
    youWon: string;
    youLost: (placement: number) => string;
    spectatingBadge: string;
    spectatorOverview: string;
    spectatorCycle: string;
  };
  table: {
    targetProtocol: string;
    declaredAs: string;
    tablePile: string;
    pileCount: string;
    emptyPile: string;
    yourTurnTitle: string;
    yourTurnHelp: string;
    opponentTurn: string;
    spectatorAlert: string;
    packetSnifferAlert: string;
    noPackets: string;
    myHandTitle: string;
    packetsCount: string;
    transmitCards: string;
    callTrace: string;
    callTraceHelp: string;
    selectCardsPrompt: string;
    matchCard: string;
    wildCard: string;
    bluffCard: string;
    playAgain: string;
    nextRound: string;
    matchWon: string;
    matchOverDesc: string;
    claimedAsTarget: string;
    waitYourTurn: string;
    noCardsOnTable: string;
    confidential: string;
    busEncrypted: string;
  };
  chips: {
    packetSniffer: string;
    packetSnifferDesc: string;
    empFlare: string;
    empFlareDesc: string;
    overclockInjector: string;
    overclockInjectorDesc: string;
    groundWire: string;
    groundWireDesc: string;
    burned: string;
    installed: string;
    socketEmpty: string;
  };
  voltage: {
    modalTitle: string;
    criticalOverload: string;
    dischargeComplete: string;
    targetOperator: string;
    impendingText: string;
    triggerDischarge: string;
    useGroundWire: string;
    dismiss: string;
    rollResult: string;
    testedRisk: string;
    stabilizedDesc: string;
    overloadDesc: string;
    pendingSelfAlert: string;
    pendingOpponentAlert: string;
  };
  intermission: {
    roundOverTitle: string;
    operatorsAlive: string;
    survivedAttempt: string;
    riskIncreased: string;
    operatorEliminated: string;
    nextCycleAuto: string;
    spectatorModeNotice: string;
    fallbackStart: string;
    breakdownDesc: string;
    dischargeResolving: string;
  };
  arena: {
    hologramProtocol: string;
    hologramPile: string;
    hologramYourTurn: string;
    hologramTurnOf: string;
    overloadTitle: string;
    overloadSub: string;
    visorBlackout: string;
    visorTransmitting: string;
    visorLocked: string;
    visorHighVoltage: string;
    visorSynthesis: string;
    cardReady: string;
    cardSelectHint: string;
    cardBack: string;
  };
  hud: {
    turnTimer: string;
    dischargeTimer: string;
    yourTurnBanner: string;
    opponentTurnBanner: string;
    empPickerTitle: string;
    empPickerHint: string;
    empPickerCurrent: string;
    empPickerCancel: string;
    chipLabel: string;
    cameraPov: string;
    cameraTable: string;
    cameraRivals: string;
    secondsShort: string;
    hurryUp: string;
    roundIntroTitle: (round: number) => string;
    roundIntroProtocol: string;
    roundIntroHint: string;
    muteAudio: string;
    unmuteAudio: string;
    muteVoice: string;
    unmuteVoice: string;
    gfxHigh: string;
    gfxLow: string;
    gfxToggleTooltip: string;
  };
  voice: {
    playCards: (count: number, protocol: string) => string;
    liar: string;
    eliminated: string;
    win: string;
  };
  verdict: {
    bluffDetected: string;
    cleanTransmission: string;
    loserVoltageTest: (nickname: string) => string;
    youVoltageTest: string;
    traceTitle: string;
    traces: string;
    you: string;
    claim: (count: number, protocol: string) => string;
    scanning: string;
    showdownTitle: string;
    voltageTitle: string;
    steps: readonly [string, string, string, string];
    roleAccused: string;
    tagToTest: string;
    tagSafe: string;
    bluffReason: (bluffCount: number, total: number, protocol: string) => string;
    cleanReason: (protocol: string) => string;
    deciding: (nickname: string) => string;
    yourDecision: string;
    awaiting: string;
    skipHint: string;
    groundWireShort: string;
    dischargeShort: string;
  };
  discharge: {
    charging: string;
    rolling: string;
    rule: (risk: number) => string;
    held: string;
    shorted: string;
    riskNow: (risk: number) => string;
  };
  controls: {
    hotkeysTitle: string;
    hotkeysCards: string;
    hotkeysTransmit: string;
    hotkeysTrace: string;
    hotkeysChip: string;
    hotkeysClear: string;
    hotkeysHelp: string;
    hotkeysClose: string;
    firstTurnHint: string;
    firstTurnDismiss: string;
    legendMatch: string;
    legendWild: string;
    legendBluff: string;
  };
  rules: {
    modalTitle: string;
    shortSummary: string;
    coreGoalTitle: string;
    coreGoalText: string;
    step1Title: string;
    step1Text: string;
    step2Title: string;
    step2Text: string;
    step3Title: string;
    step3Text: string;
    step4Title: string;
    step4Text: string;
    specialCardsTitle: string;
    specialCardsDesc: string;
    glitchCardTitle: string;
    glitchCardDesc: string;
    corruptedCardTitle: string;
    corruptedCardDesc: string;
    standardCardsTitle: string;
    standardCardsDesc: string;
    chipsTitle: string;
    chipsSubtitle: string;
    snifferChipDesc: string;
    empChipDesc: string;
    overclockChipDesc: string;
    groundChipDesc: string;
    close: string;
    wildTag: string;
    bluffOnlyTag: string;
  };
  network: {
    connecting: string;
    reconnecting: string;
    disconnected: string;
    connectionError: string;
    reconnectFailed: string;
    sessionExpired: string;
    contractViolation: string;
    actionFailed: (action: string, detail: string) => string;
    dismiss: string;
  };
  feed: {
    title: string;
    you: string;
    unknownPlayer: string;
    exploits: Record<'PacketSniffer' | 'GroundWire' | 'OverclockInjector' | 'EmpFlare', string>;
    played: (who: string, count: number, protocol: string) => string;
    traceCalled: (who: string, target: string, bluff: boolean) => string;
    exploitUsed: (who: string, exploit: string) => string;
    survived: (who: string, roll: number) => string;
    overloaded: (who: string, roll: number) => string;
    eliminated: (who: string, placement: number) => string;
    roundStarted: (round: number, protocol?: string) => string;
  };
}

export const translations: Record<Language, Translations> = {
  pl: {
    common: {
      appTitle: 'PROJECT: OVERCLOCK // DEAD CIRCUIT',
      gameRules: 'Zasady gry',
      copied: 'Skopiowano!',
      copyCode: 'Kopiuj kod',
      room: 'POKÓJ',
      close: 'Zamknij',
      host: 'HOST',
      you: 'TY',
      player: 'Gracz',
      opponent: 'Przeciwnik',
      operator: 'Operator',
      status: 'STATUS',
    },
    lobby: {
      title: 'DEAD CIRCUIT',
      subtitle: 'Dead Circuit — cyberpunkowa gra blefu, zarządzania ryzykiem i przeciążeń obwodów.',
      operatorNick: 'TWÓJ IDENTYFIKATOR (NICK):',
      roomCode: 'KOD POKOJU:',
      roomCodePlaceholder: 'NP. CYBER-7X9',
      createTable: 'STWÓRZ NOWY STÓŁ',
      createTableSub: '[INITIALIZE TABLE]',
      connectTable: 'DOŁĄCZ DO STOŁU',
      connectTableSub: '[CONNECT TO TABLE]',
      waitingForPlayers: 'Oczekiwanie na dołączenie graczy...',
      playersInLobby: 'GRACZE PRZY STOLE:',
      ready: 'GOTOWY',
      notReady: 'NIEGOTOWY',
      toggleReady: 'ZMIEŃ STATUS GOTOWOŚCI',
      startMatch: 'ROZPOCZNIJ ROZGRYWKĘ',
      hostControls: 'PANEL HOSTA',
      needReadyPlayers: 'Wszyscy gracze muszą oznaczyć gotowość przed startem.',
      invitePrompt: 'Kod Twojego pokoju to:',
      inviteHelp: 'Wyślij ten kod lub link znajomym, aby dołączyli do Twojego stołu.',
      createTableDesc: 'Rozpocznij nowy stół jako gospodarz (host). Kod pokoju zostanie wygenerowany automatycznie.',
      connectTableDesc: 'Wpisz kod otrzymany od znajomego, aby zająć wolne miejsce przy stole.',
      howToPlayPrompt: 'Nie wiesz jak grać? Otwórz szybki podręcznik zasad gry',
      youTag: '(TY)',
      readyYes: 'TAK (ZMIEŃ)',
      markReady: 'OZNACZ: GOTOWY',
    },
    home: {
      heroTagline: 'Blefuj, ryzykuj i przetrwaj przeciążenie obwodów.',
      nicknameLabel: 'Twój nick',
      nicknamePlaceholder: 'Wpisz nick',
      createCta: 'Stwórz stół',
      joinHeading: 'Masz kod od znajomego?',
      joinCta: 'Dołącz',
      characterHeading: 'Wybierz postać',
      invite: 'Zaproś',
      inviteShareTitle: 'Dead Circuit',
      inviteShareText: 'Dołącz do mojego stołu w Dead Circuit!',
      inviteCopied: 'Link do stołu skopiowany.',
      inviteFailed: 'Nie udało się skopiować linku.',
      leaveTable: 'Opuść stół',
      characterPickerTitle: 'WYBIERZ POSTAĆ OPERATORA (CYBER-RIG 3D):',
      characterActive: 'WYBRANY',
      characterTaken: 'ZAJĘTY',
      avatarReady: 'AWATAR 3D GOTOWY',
      leaveConfirm: 'Opuścić stół?',
      leaveYes: 'Tak',
      leaveNo: 'Nie',
      footer: 'DEAD CIRCUIT',
      debugToggle: 'Konsola dev',
      backToGame: 'Wróć do gry',
    },
    summary: {
      title: 'KONIEC ROZGRYWKI',
      winnerLabel: 'Zwycięzca',
      podiumTitle: 'Klasyfikacja',
      youTag: '(TY)',
      roundsPlayed: 'Rozegrane rundy',
      playersCount: 'Liczba graczy',
      playAgain: 'Zagraj ponownie',
      waitingForHost: 'Czekamy, aż host rozpocznie rewanż...',
      leave: 'Opuść stół',
      youWon: 'WYGRAŁEŚ',
      youLost: (placement: number) => `PRZEGRAŁEŚ — miejsce #${placement}`,
      spectatingBadge: 'OBSERWUJESZ',
      spectatorOverview: 'Widok ogólny',
      spectatorCycle: 'Przełącz operatora',
    },
    table: {
      targetProtocol: 'WYMAGANY PROTOKÓŁ:',
      declaredAs: 'DEKLAROWANY PROTOKÓŁ:',
      tablePile: 'STOS KART NA STOLE',
      pileCount: 'KART NA STOLE:',
      emptyPile: 'STOS JEST PUSTY — WYŁÓŻ PIERWSZE PAKIETY',
      yourTurnTitle: '▶ TWÓJ RUCH!',
      yourTurnHelp: 'Wybierz karty z ręki i wyłóż je jako deklarowany protokół, albo sprawdź poprzednika.',
      opponentTurn: 'Ruch gracza:',
      spectatorAlert: '⚡ AWARIA DIELEKTRYKA: TWÓJ KONDENSATOR ULEGŁ ZWARCIU. TRYB OBSERWATORA.',
      packetSnifferAlert: 'PRZECHWYCONY PAKIET POPRZEDNIKA:',
      noPackets: 'BRAK PAKIETÓW W BUFORZE',
      myHandTitle: 'TWOJE KARTY // DOSTĘPNE PAKIETY:',
      packetsCount: 'pakietów',
      transmitCards: 'WYŁÓŻ KARTY',
      callTrace: 'SPRAWDŹ BLEF (CALL TRACE)',
      callTraceHelp: 'Oskarż poprzednika o wyłożenie nieprawidłowych kart.',
      selectCardsPrompt: 'Wybierz przynajmniej jedną kartę z ręki',
      matchCard: 'ZGODNA',
      wildCard: 'DZIKA KARTA',
      bluffCard: 'BLEF',
      playAgain: 'ZAGRAJ PONOWNIE (REWANŻ)',
      nextRound: 'ROZPOCZNIJ KOLEJNĄ RUNDĘ',
      matchWon: 'ROZGRYWKA ZAKOŃCZONA: PRZETRWAŁ',
      matchOverDesc: 'Wszyscy pozostali operatorzy ulegli zniszczeniu przez przeciążenie kondensatorów.',
      claimedAsTarget: '(Wszystkie zagrywane karty deklarujesz jako wymagany protokół)',
      waitYourTurn: 'Poczekaj na swoją kolej',
      noCardsOnTable: 'Brak kart na stole do sprawdzenia',
      confidential: '[POUFNE // TYLKO TWÓJ EKRAN]',
      busEncrypted: 'MAGISTRALA ZASZYFROWANA',
    },
    chips: {
      packetSniffer: 'SNIFFER PAKIETÓW',
      packetSnifferDesc: 'Podgląda 1 losową kartę z ostatniego zagrania przeciwnika.',
      empFlare: 'ROZBŁYSK EMP',
      empFlareDesc: 'Czyści stos kart ze stołu i pozwala zmienić deklarowany protokół.',
      overclockInjector: 'INJEKTOR PRZETAKTOWANIA',
      overclockInjectorDesc: 'Skraca limit czasu tury aktywnego przeciwnika do 5 sekund.',
      groundWire: 'PRZEWÓD UZIEMIAJĄCY',
      groundWireDesc: 'Zmniejsza ryzyko przebicia kondensatora o połowę przed testem.',
      burned: 'SPALONY',
      installed: 'ZAINSTALOWANY',
      socketEmpty: 'GNIAZDO PUSTE',
    },
    voltage: {
      modalTitle: 'TEST WYSOKIEGO NAPIĘCIA KONDENSATORA',
      criticalOverload: 'KRYTYCZNE PRZECIĄŻENIE // PRZEBICIE KONDENSATORA',
      dischargeComplete: 'ROZŁADOWANIE ZAKOŃCZONE POMYŚLNIE',
      targetOperator: 'TESTOWANY OPERATOR:',
      impendingText: 'Magistrala wysokiego napięcia uzbrojona. Wyładowanie nieuniknione.',
      triggerDischarge: 'WYKONAJ ROZŁADOWANIE TESTOWE',
      useGroundWire: 'UŻYJ PRZEWODU UZIEMIAJĄCEGO (-50% RYZYKA)',
      dismiss: 'ZAMKNIJ',
      rollResult: 'WYNIK RZUTU D6',
      testedRisk: 'TESTOWANY POZIOM RYZYKA',
      stabilizedDesc: 'DIELEKTRYK WYTRZYMAŁ // UKŁAD ZESTABILIZOWANY',
      overloadDesc: 'PRZEBICIE KONDENSATORA // OPERATOR ZNISZCZONY',
      pendingSelfAlert: '⚡ TEST WYSOKIEGO NAPIĘCIA: TWÓJ RIG JEST POD NAPIĘCIEM',
      pendingOpponentAlert: '⚡ TEST WYSOKIEGO NAPIĘCIA: OPERATOR POD NAPIĘCIEM...',
    },
    intermission: {
      roundOverTitle: 'KONIEC RUNDY',
      operatorsAlive: 'W GRZE',
      survivedAttempt: 'PRZETRWAŁ TEST KONDENSATORA',
      riskIncreased: 'POZIOM RYZYKA WZRASTA DO',
      operatorEliminated: 'OPERATOR WYELIMINOWANY Z OBWODU',
      nextCycleAuto: 'START KOLEJNEGO CYKLU ZA',
      spectatorModeNotice: 'ZOSTAŁEŚ WYELIMINOWANY // TRYB OBSERWATORA',
      fallbackStart: 'WYMUŚ START RUNDY',
      breakdownDesc: 'Przebicie dielektryka. Obwód otwarty.',
      dischargeResolving: 'Trwa rozładowanie...',
    },
    arena: {
      hologramProtocol: 'PROTOKÓŁ',
      hologramPile: 'STOS',
      hologramYourTurn: 'TWÓJ RUCH',
      hologramTurnOf: 'RUCH',
      overloadTitle: '⚡ KRYTYCZNE PRZECIĄŻENIE // UTRATA SYGNAŁU',
      overloadSub: 'OBRAZ PRZEKIEROWANY NA DRONA OBSERWATORA',
      visorBlackout: 'UTRATA SYGNAŁU // BLACKOUT',
      visorTransmitting: '>>> NADAJE <<<',
      visorLocked: 'ZABLOKOWANY',
      visorHighVoltage: '⚡ RDZEŃ WYSOKIEGO NAPIĘCIA ⚡',
      visorSynthesis: 'SYNTEZA // ŁĄCZE NEURONOWE',
      cardReady: '▲ GOTOWA DO ZAGRANIA ▲',
      cardSelectHint: 'KLIKNIJ ABY WYBRAĆ',
      cardBack: 'ZASZYFROWANY PAKIET',
    },
    hud: {
      turnTimer: 'CZAS TURY',
      dischargeTimer: 'CZAS NA ROZŁADOWANIE',
      yourTurnBanner: 'TWÓJ RUCH',
      opponentTurnBanner: 'Ruch gracza',
      empPickerTitle: 'EMP FLARE // NOWY PROTOKÓŁ',
      empPickerHint: 'Wyczyść stos i wybierz nowy protokół docelowy:',
      empPickerCurrent: 'obecny',
      empPickerCancel: 'Anuluj',
      chipLabel: 'CHIP',
      cameraPov: 'POV',
      cameraTable: 'STÓŁ',
      cameraRivals: 'RYWALE',
      secondsShort: 's',
      hurryUp: 'KOŃCZY SIĘ CZAS',
      roundIntroTitle: (round) => `RUNDA ${round}`,
      roundIntroProtocol: 'PROTOKÓŁ',
      roundIntroHint: 'Zagrywaj karty tego protokołu — albo blefuj.',
      muteAudio: 'Wycisz dźwięk',
      unmuteAudio: 'Włącz dźwięk',
      muteVoice: 'Wyłącz głosy robotów',
      unmuteVoice: 'Włącz głosy robotów',
      gfxHigh: 'FX: WYSOKA',
      gfxLow: 'FX: NISKA',
      gfxToggleTooltip: 'Przełącz jakość grafiki',
    },
    voice: {
      playCards: (count: number, protocol: string) => {
        const p = protocol.toLowerCase();
        if (p === 'alpha') {
          if (count === 1) return 'jedna alfa';
          if (count === 2) return 'dwie alfy';
          if (count === 3) return 'trzy alfy';
          return `${count} alfy`;
        }
        if (p === 'beta') {
          if (count === 1) return 'jedna beta';
          if (count === 2) return 'dwie bety';
          if (count === 3) return 'trzy bety';
          return `${count} bety`;
        }
        if (p === 'gamma') {
          if (count === 1) return 'jedna gamma';
          if (count === 2) return 'dwie gammy';
          if (count === 3) return 'trzy gammy';
          return `${count} gammy`;
        }
        if (p === 'glitch') {
          if (count === 1) return 'jeden glitch';
          if (count === 2) return 'dwa glitche';
          if (count === 3) return 'trzy glitche';
          return `${count} glitche`;
        }
        if (p === 'corrupted') {
          if (count === 1) return 'jeden corrupted';
          if (count === 2) return 'dwa corrupted';
          if (count === 3) return 'trzy corrupted';
          return `${count} corrupted`;
        }
        return `${count} ${protocol}`;
      },
      liar: 'KŁAMCA!',
      eliminated: 'system... offline',
      win: 'zwycięstwo protokołu',
    },
    verdict: {
      bluffDetected: 'BLEF WYKRYTY',
      cleanTransmission: 'CZYSTA TRANSMISJA',
      loserVoltageTest: (nickname) => `${nickname} idzie na test napięcia`,
      youVoltageTest: 'TY idziesz na test napięcia',
      traceTitle: 'CALL TRACE',
      traces: 'SPRAWDZA',
      you: 'TY',
      claim: (count, protocol) => `deklaracja: ${count}× ${protocol.toUpperCase()}`,
      scanning: 'SKANOWANIE KART…',
      showdownTitle: 'SPRAWDZENIE BLEFU',
      voltageTitle: 'TEST NAPIĘCIA',
      steps: ['SPRAWDZENIE', 'WERDYKT', 'TEST NAPIĘCIA', 'WYŁADOWANIE'],
      roleAccused: 'SPRAWDZANY',
      tagToTest: 'NA TEST NAPIĘCIA',
      tagSafe: 'BEZPIECZNY',
      bluffReason: (bluffCount, total, protocol) =>
        `${bluffCount} z ${total} kart to nie ${protocol.toUpperCase()}`,
      cleanReason: (protocol) => `wszystkie karty pasują do ${protocol.toUpperCase()}`,
      deciding: (nickname) => `${nickname} decyduje…`,
      yourDecision: 'TWOJA DECYZJA',
      awaiting: 'UZBRAJANIE KONDENSATORA…',
      skipHint: 'SPACJA / DOTKNIJ, ABY POMINĄĆ',
      groundWireShort: 'UZIEMIENIE −50%',
      dischargeShort: 'ROZŁADUJ',
    },
    discharge: {
      charging: 'ŁADOWANIE KONDENSATORA',
      rolling: 'RZUT K6',
      rule: (risk) => `zwarcie przy wyniku ≤ ${risk}`,
      held: 'IZOLACJA WYTRZYMAŁA',
      shorted: 'ZWARCIE // ELIMINACJA',
      riskNow: (risk) => `ryzyko teraz ${risk}/6`,
    },
    controls: {
      hotkeysTitle: 'SKRÓTY KLAWISZOWE',
      hotkeysCards: 'Zaznacz / odznacz kartę z ręki',
      hotkeysTransmit: 'Wyślij zaznaczone karty',
      hotkeysTrace: 'Sprawdź blef',
      hotkeysChip: 'Użyj chipa',
      hotkeysClear: 'Odznacz karty / zamknij okno',
      hotkeysHelp: 'Pokaż / ukryj tę ściągawkę',
      hotkeysClose: 'Zamknij',
      firstTurnHint: 'Zaznacz 1–3 karty, a następnie wyślij je.',
      firstTurnDismiss: 'Rozumiem',
      legendMatch: 'zgodna',
      legendWild: 'dzika',
      legendBluff: 'blef',
    },
    rules: {
      modalTitle: 'ZASADY GRY // DEAD CIRCUIT',
      shortSummary: 'Cyberpunkowa gra blefu i zarządzania ryzykiem oparta o mechanikę Oszusta (Liar\'s Dice / Cheat).',
      coreGoalTitle: '1. Cel rozgrywki',
      coreGoalText: 'Pozbądź się wszystkich swoich kart lub doprowadź do sytuacji, w której wszyscy przeciwnicy odpadną przez przeciążenie swoich kondensatorów.',
      step1Title: '2. Wymagany protokół i zagrywanie',
      step1Text: 'W każdej turze obowiązuje Wymagany Protokół (Alpha, Beta, Gamma, Delta). Zagrywasz 1 do 3 kart koszulką do góry, twierdząc, że wszystkie odpowiadają temu protokołowi.',
      step2Title: '3. Prawda czy blef?',
      step2Text: 'Możesz mówić prawdę (wykładać zgodne karty lub dziką kartę GLITCH) albo bezczelnie blefować, wykładając zupełnie inne karty.',
      step3Title: '4. Sprawdzenie blefu (Call Trace)',
      step3Text: 'Kolejny gracz zamiast wykładać karty może wcisnąć SPRAWDŹ BLEF. Odkrywane są ostatnio wyłożone karty. Jeśli gracz blefował – jego kondensator ładuje się! Jeśli mówił prawdę – to oskarżyciel otrzymuje ładunek do kondensatora.',
      step4Title: '5. Przebicie dielektryka (Eliminacja)',
      step4Text: 'Każdy otrzymany ładunek zwiększa ryzyko wyładowania. Podczas testu napięcia kość rozstrzyga, czy kondensator wytrzyma. Przeciążenie oznacza natychmiastowe zwarcie i odpadnięcie z gry!',
      specialCardsTitle: '6. Karty Specjalne w Talii',
      specialCardsDesc: 'Talia zawiera pakiety standardowe oraz dwa kluczowe typy kart specjalnych:',
      glitchCardTitle: 'GLITCH [!] (OVERRIDE // DZIKA KARTA)',
      glitchCardDesc: 'Karta uniwersalna (joker). Zawsze pasuje do każdego wymaganego protokołu (Alpha, Beta, Gamma). Jeśli przeciwnik sprawdzi Twoje zagranie (Call Trace), Glitch jest traktowany jako w 100% poprawna karta — oskarżyciel przegrywa test i to on ładuje kondensator!',
      corruptedCardTitle: 'CORRUPTED [X] (USZKODZONY PAKIET // WIRUS)',
      corruptedCardDesc: 'Karta o zerowej integralności sygnału. Nie pasuje do żadnego protokołu. Każde jej wyłożenie to ZAWSZE blef! Twoim celem jest pozbycie się jej z ręki tak sprytnie, by nikt nie odważył się Ciebie sprawdzić.',
      standardCardsTitle: 'ALPHA [A], BETA [B], GAMMA [G] (KARTY BAZOWE)',
      standardCardsDesc: 'Standardowe pakiety protokołów magistrali. Są zgodne z prawdą wyłącznie wtedy, gdy na stole obowiązuje ich identyczny protokół.',
      chipsTitle: '7. Chipy Akcji (Moduły Exploit DIP-8)',
      chipsSubtitle: 'Każdy gracz posiada unikalny jednorazowy chip, który można aktywować w trakcie pojedynku:',
      snifferChipDesc: 'SN74-SNIFF // SNIFFER: Podejrzyj 1 losową kartę z ostatniego zagrania rywala. Sprawdź, czy mówił prawdę przed wykonaniem ruchu.',
      empChipDesc: 'SN74-FLARE // ROZBŁYSK EMP: Czyści cały stos kart na stole do zera i natychmiast narzuca nowy wybrany przez Ciebie protokół docelowy.',
      overclockChipDesc: 'SN74-INJ // INJEKTOR: Przerywa turę przeciwnika i skraca jego limit czasu do zaledwie 5 sekund, wymuszając błąd pod presją.',
      groundChipDesc: 'SN74-GND // UZIEMIENIE: Aktywowane przed wyładowaniem kondensatora. Obniża poziom ryzyka awarii o 50% przed rzutem kością.',
      close: 'ZAMKNIJ PRZEWODNIK',
      wildTag: 'DOWOLNA',
      bluffOnlyTag: 'TYLKO BLEF',
    },
    network: {
      connecting: 'Łączenie…',
      reconnecting: 'Ponowne łączenie…',
      disconnected: 'Rozłączono',
      connectionError: 'Błąd połączenia z serwerem',
      reconnectFailed: 'Nie udało się wrócić do pokoju. Dołącz ponownie.',
      sessionExpired: 'Sesja wygasła. Wróć do lobby.',
      contractViolation: 'Otrzymano nieprawidłowe dane z serwera',
      actionFailed: (action, detail) => `Akcja nie powiodła się (${action}): ${detail}`,
      dismiss: 'Zamknij',
    },
    feed: {
      title: 'ZDARZENIA',
      you: 'Ty',
      unknownPlayer: 'Nieznany',
      exploits: { PacketSniffer: 'SNIFFER', GroundWire: 'UZIEMIENIE', OverclockInjector: 'OVERCLOCK', EmpFlare: 'EMP FLARE' },
      played: (who, count, protocol) => `${who} zagrywa ${count}× ${protocol}`,
      traceCalled: (who, target, bluff) => `${who} sprawdza ${target} — ${bluff ? 'BLEF!' : 'czysto'}`,
      exploitUsed: (who, exploit) => `${who} używa ${exploit}`,
      survived: (who, roll) => `${who} przeżywa wyładowanie (rzut ${roll})`,
      overloaded: (who, roll) => `${who} przeciążony! (rzut ${roll})`,
      eliminated: (who, placement) => `${who} wyeliminowany — #${placement}`,
      roundStarted: (round, protocol) =>
        protocol ? `Runda ${round} rozpoczęta — protokół ${protocol}` : `Runda ${round} rozpoczęta`,
    },
  },
  en: {
    common: {
      appTitle: 'PROJECT: OVERCLOCK // DEAD CIRCUIT',
      gameRules: 'Game Rules',
      copied: 'Copied!',
      copyCode: 'Copy Code',
      room: 'ROOM',
      close: 'Close',
      host: 'HOST',
      you: 'YOU',
      player: 'Player',
      opponent: 'Opponent',
      operator: 'Operator',
      status: 'STATUS',
    },
    lobby: {
      title: 'DEAD CIRCUIT',
      subtitle: 'Dead Circuit — a cyberpunk game of bluffing, hardware risks, and capacitor overloads.',
      operatorNick: 'OPERATOR IDENTIFIER (NICKNAME):',
      roomCode: 'ROOM CODE:',
      roomCodePlaceholder: 'E.G. CYBER-7X9',
      createTable: 'CREATE TABLE',
      createTableSub: '[INITIALIZE TABLE]',
      connectTable: 'JOIN TABLE',
      connectTableSub: '[CONNECT TO TABLE]',
      waitingForPlayers: 'Awaiting operators to join...',
      playersInLobby: 'OPERATORS AT TABLE:',
      ready: 'READY',
      notReady: 'NOT READY',
      toggleReady: 'TOGGLE READY STATUS',
      startMatch: 'START MATCH',
      hostControls: 'HOST CONTROLS',
      needReadyPlayers: 'All operators must be marked READY before launch.',
      invitePrompt: 'Your room code is:',
      inviteHelp: 'Share this code or invitation link with other operators to let them join.',
      createTableDesc: 'Launch a new table as host. A unique room code will be automatically generated.',
      connectTableDesc: 'Enter the room code received from a friend to join the table.',
      howToPlayPrompt: 'Need help? Open the quick operational rules guide',
      youTag: '(YOU)',
      readyYes: 'YES (TOGGLE)',
      markReady: 'MARK: READY',
    },
    home: {
      heroTagline: 'Bluff, take risks and survive the circuit overload.',
      nicknameLabel: 'Your nickname',
      nicknamePlaceholder: 'Enter a nickname',
      createCta: 'Create table',
      joinHeading: 'Got a code from a friend?',
      joinCta: 'Join',
      characterHeading: 'Pick your character',
      invite: 'Invite',
      inviteShareTitle: 'Dead Circuit',
      inviteShareText: 'Join my table in Dead Circuit!',
      inviteCopied: 'Table link copied.',
      inviteFailed: 'Could not copy the link.',
      leaveTable: 'Leave table',
      characterPickerTitle: 'SELECT 3D OPERATOR RIG:',
      characterActive: 'ACTIVE',
      characterTaken: 'TAKEN',
      avatarReady: '3D AVATAR READY',
      leaveConfirm: 'Leave table?',
      leaveYes: 'Yes',
      leaveNo: 'No',
      footer: 'DEAD CIRCUIT',
      debugToggle: 'Dev console',
      backToGame: 'Back to game',
    },
    summary: {
      title: 'MATCH OVER',
      winnerLabel: 'Winner',
      podiumTitle: 'Standings',
      youTag: '(YOU)',
      roundsPlayed: 'Rounds played',
      playersCount: 'Players',
      playAgain: 'Play again',
      waitingForHost: 'Waiting for the host to start a rematch...',
      leave: 'Leave table',
      youWon: 'VICTORY',
      youLost: (placement: number) => `DEFEAT — #${placement} place`,
      spectatingBadge: 'SPECTATING',
      spectatorOverview: 'Overview',
      spectatorCycle: 'Cycle operator',
    },
    table: {
      targetProtocol: 'TARGET PROTOCOL:',
      declaredAs: 'TRANSMITTING AS:',
      tablePile: 'TABLE PILE',
      pileCount: 'PACKETS ON TABLE:',
      emptyPile: 'PILE IS EMPTY — TRANSMIT INITIAL PACKETS',
      yourTurnTitle: '▶ YOUR TURN!',
      yourTurnHelp: 'Select packets from buffer and transmit as declared protocol, or call trace on previous play.',
      opponentTurn: 'Operator turn:',
      spectatorAlert: '⚡ DIELECTRIC BREAKDOWN: OPERATOR SHORT-CIRCUITED (SPECTATOR MODE).',
      packetSnifferAlert: 'INTERCEPTED PACKET FROM PREVIOUS PLAY:',
      noPackets: 'NO HARDWARE PACKETS IN LOCAL BUFFER',
      myHandTitle: 'OPERATOR HAND // PACKETS AVAILABLE:',
      packetsCount: 'packets',
      transmitCards: 'TRANSMIT PACKETS',
      callTrace: 'CALL TRACE (CALL BLUFF)',
      callTraceHelp: 'Accuse previous operator of transmitting fraudulent packets.',
      selectCardsPrompt: 'Select at least 1 packet from your hand',
      matchCard: 'MATCH',
      wildCard: 'WILD',
      bluffCard: 'BLUFF',
      playAgain: 'PLAY AGAIN // REMATCH',
      nextRound: 'START NEXT ROUND',
      matchWon: 'MATCH FINISHED: SURVIVED',
      matchOverDesc: 'All other operators suffered catastrophic capacitor failure / short-circuit.',
      claimedAsTarget: '(All played packets are claimed as the target protocol)',
      waitYourTurn: 'Wait for your turn',
      noCardsOnTable: 'No packets on table to challenge',
      confidential: '[CONFIDENTIAL // LOCAL OPERATOR ONLY]',
      busEncrypted: 'BUS ENCRYPTED',
    },
    chips: {
      packetSniffer: 'PACKET SNIFFER',
      packetSnifferDesc: 'Inspect 1 random card from the previous play.',
      empFlare: 'EMP FLARE',
      empFlareDesc: 'Clear the table pile and declare a new protocol.',
      overclockInjector: 'OVERCLOCK INJECTOR',
      overclockInjectorDesc: 'Collapse opponent active turn deadline to 5 seconds.',
      groundWire: 'GROUND WIRE',
      groundWireDesc: 'Halve capacitor risk before the discharge roll.',
      burned: 'BURNED',
      installed: 'INSTALLED',
      socketEmpty: 'SOCKET EMPTY',
    },
    voltage: {
      modalTitle: 'HIGH-VOLTAGE CAPACITOR TEST',
      criticalOverload: 'CRITICAL VOLTAGE OVERLOAD',
      dischargeComplete: 'DIELECTRIC DISCHARGE COMPLETE',
      targetOperator: 'TARGET OPERATOR UNDER TEST:',
      impendingText: 'High voltage bus is armed. Capacitor discharge is impending.',
      triggerDischarge: 'TRIGGER DISCHARGE TEST',
      useGroundWire: 'DEPLOY GROUND WIRE (-50% RISK)',
      dismiss: 'DISMISS',
      rollResult: 'D6 ROLL RESULT',
      testedRisk: 'TESTED RISK LEVEL',
      stabilizedDesc: 'DIELECTRIC HELD // SYSTEM STABILIZED',
      overloadDesc: 'CRITICAL OVERLOAD // OPERATOR ELIMINATED',
      pendingSelfAlert: '⚡ DIELECTRIC TEST: YOUR RIG IS UNDER HIGH VOLTAGE',
      pendingOpponentAlert: '⚡ DIELECTRIC TEST: OPERATOR UNDER HIGH VOLTAGE...',
    },
    intermission: {
      roundOverTitle: 'ROUND COMPLETED',
      operatorsAlive: 'OPERATORS ALIVE',
      survivedAttempt: 'SURVIVED CAPACITOR TEST',
      riskIncreased: 'CAPACITOR RISK LEVEL NOW',
      operatorEliminated: 'OPERATOR ELIMINATED FROM CIRCUIT',
      nextCycleAuto: 'NEXT CYCLE STARTING IN',
      spectatorModeNotice: 'YOU WERE ELIMINATED // SPECTATOR MODE',
      fallbackStart: 'FORCE START ROUND',
      breakdownDesc: 'Dielectric breakdown occurred. Circuit opened.',
      dischargeResolving: 'Discharge sequence resolving...',
    },
    arena: {
      hologramProtocol: 'PROTOCOL',
      hologramPile: 'PILE',
      hologramYourTurn: 'YOUR TURN',
      hologramTurnOf: 'TURN',
      overloadTitle: '⚡ CRITICAL OVERLOAD // SIGNAL LOST',
      overloadSub: 'FEED REDIRECTED TO SPECTATOR DRONE',
      visorBlackout: 'SIGNAL LOST // BLACKOUT',
      visorTransmitting: '>>> TRANSMITTING <<<',
      visorLocked: 'LOCKED',
      visorHighVoltage: '⚡ HIGH VOLTAGE CORE ⚡',
      visorSynthesis: 'SYNTHESIS // NEURAL LINK',
      cardReady: '▲ READY TO PLAY ▲',
      cardSelectHint: 'CLICK TO SELECT',
      cardBack: 'ENCRYPTED PACKET',
    },
    hud: {
      turnTimer: 'TURN TIMER',
      dischargeTimer: 'DISCHARGE TIMER',
      yourTurnBanner: 'YOUR TURN',
      opponentTurnBanner: 'Operator turn',
      empPickerTitle: 'EMP FLARE // NEW PROTOCOL',
      empPickerHint: 'Purge the pile and pick the new target protocol:',
      empPickerCurrent: 'current',
      empPickerCancel: 'Cancel',
      chipLabel: 'CHIP',
      cameraPov: 'POV',
      cameraTable: 'TABLE',
      cameraRivals: 'RIVALS',
      secondsShort: 's',
      hurryUp: 'TIME IS RUNNING OUT',
      roundIntroTitle: (round) => `ROUND ${round}`,
      roundIntroProtocol: 'PROTOCOL',
      roundIntroHint: 'Play cards of this protocol — or bluff.',
      muteAudio: 'Mute audio',
      unmuteAudio: 'Unmute audio',
      muteVoice: 'Disable robot voices',
      unmuteVoice: 'Enable robot voices',
      gfxHigh: 'FX: HIGH',
      gfxLow: 'FX: LOW',
      gfxToggleTooltip: 'Toggle graphics quality',
    },
    voice: {
      playCards: (count: number, protocol: string) => {
        const countWord =
          count === 1 ? 'one' : count === 2 ? 'two' : count === 3 ? 'three' : String(count);
        return `${countWord} ${protocol.toLowerCase()}`;
      },
      liar: 'LIAR!',
      eliminated: 'system... offline',
      win: 'protocol victory',
    },
    verdict: {
      bluffDetected: 'BLUFF DETECTED',
      cleanTransmission: 'CLEAN TRANSMISSION',
      loserVoltageTest: (nickname) => `${nickname} goes to voltage test`,
      youVoltageTest: 'YOU go to voltage test',
      traceTitle: 'CALL TRACE',
      traces: 'TRACES',
      you: 'YOU',
      claim: (count, protocol) => `claimed: ${count}× ${protocol.toUpperCase()}`,
      scanning: 'SCANNING CARDS…',
      showdownTitle: 'BLUFF CHECK',
      voltageTitle: 'VOLTAGE TEST',
      steps: ['TRACE', 'VERDICT', 'VOLTAGE TEST', 'DISCHARGE'],
      roleAccused: 'TRACED',
      tagToTest: 'TO VOLTAGE TEST',
      tagSafe: 'SAFE',
      bluffReason: (bluffCount, total, protocol) =>
        `${bluffCount} of ${total} cards are not ${protocol.toUpperCase()}`,
      cleanReason: (protocol) => `every card matches ${protocol.toUpperCase()}`,
      deciding: (nickname) => `${nickname} is deciding…`,
      yourDecision: 'YOUR CALL',
      awaiting: 'ARMING CAPACITOR…',
      skipHint: 'SPACE / TAP TO SKIP',
      groundWireShort: 'GROUND WIRE −50%',
      dischargeShort: 'DISCHARGE',
    },
    discharge: {
      charging: 'CHARGING CAPACITOR',
      rolling: 'D6 ROLL',
      rule: (risk) => `short circuit on ≤ ${risk}`,
      held: 'INSULATION HELD',
      shorted: 'SHORT CIRCUIT // ELIMINATED',
      riskNow: (risk) => `risk now ${risk}/6`,
    },
    controls: {
      hotkeysTitle: 'KEYBOARD SHORTCUTS',
      hotkeysCards: 'Select / deselect a card in hand',
      hotkeysTransmit: 'Transmit selected cards',
      hotkeysTrace: 'Call trace',
      hotkeysChip: 'Use chip',
      hotkeysClear: 'Clear selection / close popup',
      hotkeysHelp: 'Toggle this cheat-sheet',
      hotkeysClose: 'Close',
      firstTurnHint: 'Select 1–3 cards, then transmit them.',
      firstTurnDismiss: 'Got it',
      legendMatch: 'match',
      legendWild: 'wild',
      legendBluff: 'bluff',
    },
    rules: {
      modalTitle: 'OPERATIONAL MANUAL // DEAD CIRCUIT',
      shortSummary: 'Cyberpunk bluffing & risk management card game built upon Cheat / Liar\'s Dice.',
      coreGoalTitle: '1. Objective',
      coreGoalText: 'Empty your packet buffer or outlast all other operators as they suffer capacitor short-circuits.',
      step1Title: '2. Target Protocol & Transmissions',
      step1Text: 'A Target Protocol (Alpha, Beta, Gamma, Delta) governs each cycle. Transmit 1-3 face-down packets claiming they match the target protocol.',
      step2Title: '3. Truth or Bluff',
      step2Text: 'You can transmit matching cards, wild GLITCH cards, or bluff with unverified corrupted packets.',
      step3Title: '4. Calling Trace',
      step3Text: 'The next operator may challenge your claim by clicking CALL TRACE. If caught bluffing, your capacitor charges up! If truthful, the accuser takes the charge.',
      step4Title: '5. Dielectric Breakdown',
      step4Text: 'Each charge increases your capacitor breakdown voltage. When tested, a failed roll results in immediate short-circuit elimination.',
      specialCardsTitle: '6. Special Deck Packets',
      specialCardsDesc: 'The deck contains standard protocol packets alongside two critical special card types:',
      glitchCardTitle: 'GLITCH [!] (OVERRIDE // WILD CARD)',
      glitchCardDesc: 'Universal override packet (wildcard). Always valid for any target protocol (Alpha, Beta, Gamma). If challenged with Call Trace, Glitch is always verified as 100% truthful — the accuser fails the trace and charges their own capacitor!',
      corruptedCardTitle: 'CORRUPTED [X] (DAMAGED PACKET // VIRUS)',
      corruptedCardDesc: 'Degraded packet with zero signal integrity. Does not match any valid protocol. Transmitting it is ALWAYS a bluff! Your goal is to flush it from your hand without getting challenged.',
      standardCardsTitle: 'ALPHA [A], BETA [B], GAMMA [G] (STANDARD BUS)',
      standardCardsDesc: 'Standard bus protocol packets. Only truthful when matching the active table target protocol.',
      chipsTitle: '7. Action Exploit Chips (DIP-8 Modules)',
      chipsSubtitle: 'Each operator holds a single-use hardware exploit chip to alter the match state:',
      snifferChipDesc: 'SN74-SNIFF // PACKET SNIFFER: Inspect 1 random card from opponent previous play. Verify their truthfulness before making your move.',
      empChipDesc: 'SN74-FLARE // EMP FLARE: Flush all cards on the table to zero and immediately override the table target protocol with your choice.',
      overclockChipDesc: 'SN74-INJ // OVERCLOCK INJECTOR: Interrupt opponent active turn and collapse their timer to 5 seconds to induce panic.',
      groundChipDesc: 'SN74-GND // GROUND WIRE: Deployed before dielectric testing. Halves capacitor breakdown risk (-50%) before the D6 roll.',
      close: 'CLOSE MANUAL',
      wildTag: 'WILD',
      bluffOnlyTag: 'BLUFF ONLY',
    },
    network: {
      connecting: 'Connecting…',
      reconnecting: 'Reconnecting…',
      disconnected: 'Disconnected',
      connectionError: 'Server connection error',
      reconnectFailed: 'Could not rejoin the room. Please join again.',
      sessionExpired: 'Session expired. Returning to lobby.',
      contractViolation: 'Received invalid data from the server',
      actionFailed: (action, detail) => `Action failed (${action}): ${detail}`,
      dismiss: 'Dismiss',
    },
    feed: {
      title: 'EVENTS',
      you: 'You',
      unknownPlayer: 'Unknown',
      exploits: { PacketSniffer: 'SNIFFER', GroundWire: 'GROUND WIRE', OverclockInjector: 'OVERCLOCK', EmpFlare: 'EMP FLARE' },
      played: (who, count, protocol) => `${who} played ${count}× ${protocol}`,
      traceCalled: (who, target, bluff) => `${who} traces ${target} — ${bluff ? 'BLUFF!' : 'clean'}`,
      exploitUsed: (who, exploit) => `${who} used ${exploit}`,
      survived: (who, roll) => `${who} survived the discharge (roll ${roll})`,
      overloaded: (who, roll) => `${who} overloaded! (roll ${roll})`,
      eliminated: (who, placement) => `${who} eliminated — #${placement}`,
      roundStarted: (round, protocol) =>
        protocol ? `Round ${round} started — protocol ${protocol}` : `Round ${round} started`,
    },
  },
};

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('overclock_lang') as Language | null;
    if (saved === 'pl' || saved === 'en') {
      return saved;
    }
    // Default to Polish as requested by user
    return 'pl';
  }
  return 'pl';
};

export const useI18n = create<I18nStore>((set) => {
  const initialLang = getInitialLanguage();
  return {
    language: initialLang,
    setLanguage: (language: Language) => {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('overclock_lang', language);
      }
      set({ language, t: translations[language] });
    },
    t: translations[initialLang],
  };
});
