import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'veilo-dark': '#1a1a2e',
        'veilo-violet': '#372d5a',
        'veilo-purple': '#7C4DFF',
        'veilo-purple-hover': '#8E24AA',
        'veilo-lavender': '#B39DDB',
        'veilo-green': '#6CA765',
        'veilo-green-dark': '#588D52',
        'veilo-green-hover': '#7CB077',
        'veilo-blue': '#28A0C8',
        'veilo-blue-dark': '#2287A8',
        'veilo-orange': '#FF9326',
        'veilo-red': '#D35757',
        'veilo-text-dark': '#262A51',
        'veilo-text-input': '#383A66',
        'veilo-border': '#CDCDCD',
        'veilo-header-bg': 'rgba(0,0,0,0.7)',
      },
      fontFamily: {
        'roboto': ['Roboto Condensed', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
