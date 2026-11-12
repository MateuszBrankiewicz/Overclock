import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'hud-bg': 'rgba(9, 9, 12, 0.88)',
        'hud-bg-solid': '#09090c',
        'hud-border': 'rgba(63, 63, 70, 0.65)',
        'hud-border-bright': 'rgba(113, 113, 122, 0.85)',
        'hud-accent': '#10b981',
        'hud-danger': '#ef4444',
        'hud-warn': '#f59e0b',
        'hud-info': '#38bdf8',
        protocol: {
          alpha: '#10b981',
          beta: '#f97316',
          gamma: '#38bdf8',
          glitch: '#ec4899',
          corrupted: '#ef4444',
        },
        cyber: {
          dark: '#09090b',
          panel: '#121217',
          border: '#27272a',
          amber: '#ffb000',
          'amber-dim': '#b37b00',
          green: '#00ff66',
          'green-dim': '#009933',
          red: '#ff0033',
          cyan: '#00e5ff',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(16, 185, 129, 0.35)',
        'glow-md': '0 0 24px rgba(16, 185, 129, 0.45)',
        'glow-lg': '0 0 40px rgba(16, 185, 129, 0.6)',
        'glow-danger': '0 0 28px rgba(239, 68, 68, 0.55)',
        'glow-warn': '0 0 28px rgba(245, 158, 11, 0.55)',
        'glow-info': '0 0 28px rgba(56, 189, 248, 0.55)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Courier New', 'monospace'],
        display: ['"JetBrains Mono Display"', '"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
