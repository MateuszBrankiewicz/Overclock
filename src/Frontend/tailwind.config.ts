import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
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
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
