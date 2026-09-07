/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 明亮活泼的游戏化配色
        ink: {
          DEFAULT: '#1f2440',
          soft: '#5a6180',
          faint: '#9aa0bd',
        },
        cream: '#fdfbf7',
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#bed2ff',
          300: '#91b3ff',
          400: '#5d8bff',
          500: '#3b66f6',
          600: '#2849e0',
          700: '#223ab5',
          800: '#20338f',
          900: '#1e2e72',
        },
        mint: {
          100: '#d8f8ec',
          300: '#7fe3c0',
          500: '#22c58a',
          600: '#159e6d',
        },
        sun: {
          100: '#fff2cc',
          300: '#ffd76b',
          500: '#ffb020',
          600: '#e08800',
        },
        coral: {
          100: '#ffe4e0',
          300: '#ffab9e',
          500: '#ff6b5b',
          600: '#e04334',
        },
        grape: {
          100: '#efe6ff',
          300: '#c3a8ff',
          500: '#8b5cf6',
          600: '#6d34e8',
        },
      },
      fontFamily: {
        round: ['"Baloo 2"', '"Nunito"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        pop: '0 6px 0 0 rgba(31,36,64,0.16)',
        'pop-sm': '0 3px 0 0 rgba(31,36,64,0.14)',
        card: '0 10px 30px -12px rgba(31,36,64,0.28)',
        glow: '0 0 0 4px rgba(59,102,246,0.18)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '70%': { transform: 'scale(1.04)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 260ms cubic-bezier(.34,1.56,.64,1) both',
        float: 'float 2.6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-ring': 'pulse-ring 1.4s ease-out infinite',
      },
    },
  },
  plugins: [],
};
