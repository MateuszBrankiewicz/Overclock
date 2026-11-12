export type CharacterId = 'ghost' | 'volt' | 'proxy' | 'null';

export interface CharacterProfile {
  id: CharacterId;
  codename: string;
  rolePl: string;
  roleEn: string;
  bioPl: string;
  bioEn: string;
  perkLabelPl: string;
  perkLabelEn: string;
  primaryColor: string;
  secondaryColor: string;
  armorColor: string;
  accentBadgeClass: string;
  borderGlowClass: string;
  visorStyle: 'matrix' | 'tesla' | 'dome' | 'crt';
}

export interface LocalizedCharacterText {
  role: string;
  bio: string;
  perk: string;
}

/** Picks the localized copy of a character profile (the catalog is data, not UI strings). */
export function getCharacterText(
  profile: CharacterProfile,
  language: 'pl' | 'en'
): LocalizedCharacterText {
  return language === 'pl'
    ? { role: profile.rolePl, bio: profile.bioPl, perk: profile.perkLabelPl }
    : { role: profile.roleEn, bio: profile.bioEn, perk: profile.perkLabelEn };
}

export const CHARACTER_CATALOG: readonly CharacterProfile[] = [
  {
    id: 'ghost',
    codename: 'GHOST-01',
    rolePl: 'NETRUNNER // SZYFRANT WIDMO',
    roleEn: 'NETRUNNER // PHANTOM CIPHER',
    bioPl: 'Kaptur maskujący termikę i wizjer LED reagujący na puls oraz wykryte kłamstwa.',
    bioEn: 'Thermal-cloaked hood and LED matrix visor reactive to pulse spikes and bluffs.',
    perkLabelPl: 'WIZJER: MATRYCA TAKTYCZNA LED',
    perkLabelEn: 'VISOR: TACTICAL LED MATRIX',
    primaryColor: '#10b981',
    secondaryColor: '#f59e0b',
    armorColor: '#18181b',
    accentBadgeClass: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/70',
    borderGlowClass: 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.4)]',
    visorStyle: 'matrix',
  },
  {
    id: 'volt',
    codename: 'VOLT-9',
    rolePl: 'HEAVY SPLICER // TECHNIK WYSOKIEGO NAPIĘCIA',
    roleEn: 'HEAVY SPLICER // HIGH-VOLTAGE RIG',
    bioPl: 'Ciężki pancerz izolacyjny z dwiema cewkami Tesli na barkach, które iskrzą wraz z ryzykiem.',
    bioEn: 'Heavy dielectric armor with dual shoulder Tesla coils that arc as capacitor risk climbs.',
    perkLabelPl: 'RDZEŃ: PODWÓJNE CEWKI TESLI',
    perkLabelEn: 'CORE: DUAL TESLA ARCS',
    primaryColor: '#f59e0b',
    secondaryColor: '#fbbf24',
    armorColor: '#27272a',
    accentBadgeClass: 'text-amber-300 bg-amber-950/80 border-amber-500/70',
    borderGlowClass: 'border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.4)]',
    visorStyle: 'tesla',
  },
  {
    id: 'proxy',
    codename: 'PROXY-X',
    rolePl: 'SYNTH-ANDROID // PROCESOR NEURONOWY',
    roleEn: 'SYNTH-ANDROID // NEURAL CORE',
    bioPl: 'Przezroczysta kopuła czaszki z widocznym rdzeniem kwantowym i chłodzeniem cieczą.',
    bioEn: 'Translucent cranial dome exposing a pulsing quantum core and cryo-cooling conduits.',
    perkLabelPl: 'CZASZKA: KOPUŁA KRYO-KWANTOWA',
    perkLabelEn: 'CRANIUM: CRYO-QUANTUM DOME',
    primaryColor: '#06b6d4',
    secondaryColor: '#38bdf8',
    armorColor: '#1e293b',
    accentBadgeClass: 'text-cyan-300 bg-cyan-950/80 border-cyan-500/70',
    borderGlowClass: 'border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)]',
    visorStyle: 'dome',
  },
  {
    id: 'null',
    codename: 'NULL-404',
    rolePl: 'CORRUPTED BORG // ANOMALIA MAGISTRALI',
    roleEn: 'CORRUPTED BORG // BUS ANOMALY',
    bioPl: 'Asymetryczny monitor CRT zamiast twarzy, wyświetlający przebieg oscyloskopu i błędy Glitch.',
    bioEn: 'Asymmetric CRT faceplate projecting live oscilloscope waveforms and glitch static.',
    perkLabelPl: 'FRONT: MONITOR KINESKOPOWY CRT',
    perkLabelEn: 'FACEPLATE: CRT OSCILLOSCOPE',
    primaryColor: '#e879f9',
    secondaryColor: '#ef4444',
    armorColor: '#1f122b',
    accentBadgeClass: 'text-fuchsia-300 bg-fuchsia-950/80 border-fuchsia-500/70',
    borderGlowClass: 'border-fuchsia-500 shadow-[0_0_25px_rgba(217,70,239,0.4)]',
    visorStyle: 'crt',
  },
] as const;

export function getCharacterById(id: CharacterId): CharacterProfile {
  return CHARACTER_CATALOG.find((c) => c.id === id) ?? CHARACTER_CATALOG[0];
}

export function resolveSeatCharacter(
  seatPlayerId: string,
  myPlayerId: string | null,
  selectedCharacterId: CharacterId,
  seatIndex = 0,
  characterOverrides?: Record<string, CharacterId>
): CharacterProfile {
  if (myPlayerId && seatPlayerId === myPlayerId) {
    return getCharacterById(selectedCharacterId);
  }

  const override = characterOverrides?.[seatPlayerId];
  if (override) {
    return getCharacterById(override);
  }

  const otherCharacters = CHARACTER_CATALOG.filter((c) => c.id !== selectedCharacterId);
  let hash = seatIndex * 17;
  for (let i = 0; i < seatPlayerId.length; i++) {
    hash = (hash * 31 + seatPlayerId.charCodeAt(i)) >>> 0;
  }
  const picked = otherCharacters[hash % otherCharacters.length] ?? CHARACTER_CATALOG[0];
  return picked;
}
