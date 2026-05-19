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
