/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,css,scss}'],
  theme: {
    extend: {
      colors: {
        primary:   '#FF6B35',
        secondary: '#1A1A2E',
        accent:    '#E94560',
        success:   '#06D6A0',
        warning:   '#FFD166',
        info:      '#4CC9F0',
        'dark-bg':  '#0F0F1A',
        'card-bg':  '#1E1E32',
        'card-bg-2': '#16162A',
        'border-subtle': 'rgba(255,255,255,0.07)',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        'card':    '0 4px 24px rgba(0, 0, 0, 0.2)',
        'glow-sm': '0 0 12px rgba(255, 107, 53, 0.25)',
        'glow':    '0 0 24px rgba(255, 107, 53, 0.35)',
        'glow-lg': '0 0 48px rgba(255, 107, 53, 0.4)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #FF6B35, #E94560)',
        'gradient-dark':    'linear-gradient(135deg, #1A1A2E, #0F0F1A)',
        'gradient-success': 'linear-gradient(135deg, #06D6A0, #059669)',
        'gradient-card':    'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(233,69,96,0.08))',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%':      { transform: 'translateX(4px)' },
        },
        'flash-success': {
          '0%':   { backgroundColor: 'transparent' },
          '50%':  { backgroundColor: 'rgba(6,214,160,0.2)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'skeleton-shimmer': {
          '0%':   { backgroundPosition:  '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'ai-bounce': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%':           { transform: 'scale(1)',   opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(1)',   opacity: '1' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
      },
      animation: {
        'shake':         'shake 0.5s ease-in-out',
        'flash-success': 'flash-success 1s ease-in-out',
        'skeleton':      'skeleton-shimmer 1.5s infinite linear',
        'ai-bounce':     'ai-bounce 1.4s ease-in-out infinite',
        'slide-up':      'slide-up 0.3s ease',
        'fade-in':       'fade-in 0.25s ease',
        'scale-in':      'scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        'pulse-ring':    'pulse-ring 1.5s ease-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
};
