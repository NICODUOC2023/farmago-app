/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#5B4FE8',
        accent: '#4ECDC4',
        background: '#EDEBFB',
        surface: '#FFFFFF',
        'text-primary': '#1E1B3A',
        'text-secondary': '#8B87A8',
        'nav-bg': '#EDE9FE',
      },
      fontFamily: {
        plus: ['PlusJakartaSans_400Regular'],
        'plus-medium': ['PlusJakartaSans_500Medium'],
        'plus-semibold': ['PlusJakartaSans_600SemiBold'],
        'plus-bold': ['PlusJakartaSans_700Bold'],
        'plus-extrabold': ['PlusJakartaSans_800ExtraBold'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};