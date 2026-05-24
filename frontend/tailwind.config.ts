import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF5F0',
          100: '#FFE6D9',
          200: '#FFCDB3',
          300: '#FFB48C',
          400: '#FF9B66',
          500: '#F24E1E',
          600: '#D94A1A',
          700: '#BF4616',
          800: '#A54212',
          900: '#8B3E0E',
        },
        secondary: {
          50: '#F0F4F9',
          100: '#E1E9F3',
          200: '#C3D3E7',
          300: '#A5BDDB',
          400: '#87A7CF',
          500: '#1F3A5F',
          600: '#1C3555',
          700: '#19304B',
          800: '#162B41',
          900: '#132637',
        },
      },
      animation: {
        spinSlow: 'spinSlow 6s linear infinite',
        slideFade: 'slideFade 6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'bounce-slow': 'bounceSlow 3s ease-in-out infinite',
      },
      keyframes: {
        spinSlow: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        slideFade: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '20%': { opacity: '1', transform: 'translateX(0)' },
          '80%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(30px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
