/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#0A0A0A',
        concrete: '#222222',
        'concrete-light': '#2E2E2E',
        lime: '#CCFF00',
        'lime-dim': '#AADD00',
        'lime-dark': '#88BB00',
        ash: '#888888',
        smoke: '#AAAAAA',
        offwhite: '#F0F0F0',
        // Legacy bark colors kept for breed pages
        bark: { 50:'#fdf8f0', 100:'#f5e8d0', 500:'#a0621c', 700:'#7d4a10' },
      },
      fontFamily: {
        display: ['"Anton"', '"Impact"', 'sans-serif'],
        heading: ['"Archivo Black"', '"Arial Black"', 'sans-serif'],
        body: ['"Barlow Condensed"', '"Barlow"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      fontSize: {
        '10xl': '10rem',
        '11xl': '12rem',
        '12xl': '14rem',
      },
      animation: {
        'marquee': 'marquee 12s linear infinite',
        'marquee-slow': 'marquee 24s linear infinite',
        'marquee-fast': 'marquee 6s linear infinite',
        'marquee-reverse': 'marquee-reverse 14s linear infinite',
        'glitch': 'glitch 0.4s steps(2) infinite',
        'glitch-once': 'glitch 0.4s steps(2) 1',
        'pulse-lime': 'pulse-lime 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease forwards',
        'flicker': 'flicker 3s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        glitch: {
          '0%':   { transform: 'translate(0,0)',    clipPath: 'inset(0 0 0 0)' },
          '10%':  { transform: 'translate(-3px,1px)', clipPath: 'inset(20% 0 50% 0)' },
          '20%':  { transform: 'translate(3px,-1px)', clipPath: 'inset(60% 0 10% 0)' },
          '30%':  { transform: 'translate(-1px,3px)', clipPath: 'inset(0 0 80% 0)' },
          '40%':  { transform: 'translate(1px,-3px)', clipPath: 'inset(40% 0 40% 0)' },
          '50%':  { transform: 'translate(-3px,1px)', clipPath: 'inset(10% 0 70% 0)' },
          '100%': { transform: 'translate(0,0)',    clipPath: 'inset(0 0 0 0)' },
        },
        'pulse-lime': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(204,255,0,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(204,255,0,0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'flicker': {
          '0%,19%,21%,23%,25%,54%,56%,100%': { opacity: '1' },
          '20%,24%,55%': { opacity: '0.4' },
        },
      },
      boxShadow: {
        'hard':       '4px 4px 0px #CCFF00',
        'hard-white': '4px 4px 0px #FFFFFF',
        'hard-black': '4px 4px 0px #000000',
        'hard-lg':    '6px 6px 0px #CCFF00',
        'hard-red':   '4px 4px 0px #FF3B3B',
        'hard-sm':    '2px 2px 0px #CCFF00',
        'glow-lime':  '0 0 20px rgba(204,255,0,0.35), 0 0 60px rgba(204,255,0,0.1)',
      },
      borderWidth: {
        '3': '3px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
};
