/** @type {import('tailwindcss').Config} */
const { colors } = require('@yemek-takip/ui-tokens');

module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        accent: colors.accent,
      },
    },
  },
  plugins: [],
};
