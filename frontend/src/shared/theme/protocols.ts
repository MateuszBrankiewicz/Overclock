export const PROTOCOL_THEME = {
  Alpha: {
    hex: '#10b981',
    rgb: [0.06, 0.72, 0.51] as [number, number, number],
    label: 'Alpha',
  },
  Beta: {
    hex: '#f97316',
    rgb: [0.98, 0.45, 0.09] as [number, number, number],
    label: 'Beta',
  },
  Gamma: {
    hex: '#38bdf8',
    rgb: [0.22, 0.74, 0.97] as [number, number, number],
    label: 'Gamma',
  },
  Glitch: {
    hex: '#ec4899',
    rgb: [0.93, 0.28, 0.6] as [number, number, number],
    label: 'Glitch',
  },
  Corrupted: {
    hex: '#ef4444',
    rgb: [0.94, 0.27, 0.27] as [number, number, number],
    label: 'Corrupted',
  },
} as const;

export const PROTOCOL_HEX: Record<string, string> = {
  Alpha: PROTOCOL_THEME.Alpha.hex,
  Beta: PROTOCOL_THEME.Beta.hex,
  Gamma: PROTOCOL_THEME.Gamma.hex,
  Glitch: PROTOCOL_THEME.Glitch.hex,
  Corrupted: PROTOCOL_THEME.Corrupted.hex,
};
