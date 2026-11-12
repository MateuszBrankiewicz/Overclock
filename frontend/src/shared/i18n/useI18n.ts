import { create } from 'zustand';

export type Language = 'pl' | 'en';

export interface Translations {
  common: {
    appTitle: string;
    operatingTable: string;
    debugTerminal: string;
    gameRules: string;
    copied: string;
    copyCode: string;
    copyLink: string;
    room: string;
    netOnline: string;
    netOffline: string;
    status: string;
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
  };
}

export const translations: Record<Language, Translations> = {
  pl: {
    common: {
      appTitle: 'PROJECT: OVERCLOCK // DEAD CIRCUIT',
      operatingTable: 'STÓŁ ROZGRYWKI',
      debugTerminal: 'KONSOLA DIAGNOSTYCZNA',
      gameRules: 'Zasady gry',
      copied: 'Skopiowano!',
      copyCode: 'Kopiuj kod',
      copyLink: 'Kopiuj link do pokoju',
      room: 'POKÓJ',
      netOnline: 'SIEĆ: ONLINE',
      netOffline: 'SIEĆ: ROZŁĄCZONO',
      status: 'STATUS',
    },
    lobby: {
      title: 'STANOWISKO OPERATORA // KONFIGURACJA GRY',
      subtitle: 'Dead Circuit — cyberpunkowa gra blefu, zarządzania ryzykiem i przeciążeń obwodów.',
      operatorNick: 'TWÓJ IDENTYFIKATOR (NICK):',
      roomCode: 'KOD POKOJU (POZOSTAW PUSTE DLA NOWEGO STOŁU):',
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
    },
  },
  en: {
    common: {
      appTitle: 'PROJECT: OVERCLOCK // DEAD CIRCUIT',
      operatingTable: 'OPERATING TABLE',
      debugTerminal: 'DEBUG TERMINAL',
      gameRules: 'Game Rules',
      copied: 'Copied!',
      copyCode: 'Copy Code',
      copyLink: 'Copy Room Link',
      room: 'ROOM',
      netOnline: 'NET: ONLINE',
      netOffline: 'NET: OFFLINE',
      status: 'STATUS',
    },
    lobby: {
      title: 'HARDWARE TERMINAL // DECK SETUP',
      subtitle: 'Dead Circuit — a cyberpunk game of bluffing, hardware risks, and capacitor overloads.',
      operatorNick: 'OPERATOR IDENTIFIER (NICKNAME):',
      roomCode: 'ROOM CODE (EMPTY TO CREATE NEW LOBBY):',
      roomCodePlaceholder: 'E.G. CYBER-7X9',
      createTable: 'INITIALIZE TABLE',
      createTableSub: '[INITIALIZE TABLE]',
      connectTable: 'CONNECT TO TABLE',
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
