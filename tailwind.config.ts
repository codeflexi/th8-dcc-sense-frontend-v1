import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Prompt', ...defaultTheme.fontFamily.sans],
        mono: ['IBM Plex Mono', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        // TH8 Brand Colors
        primary: {
          DEFAULT: '#DC2626', // Red 600
          foreground: '#FFFFFF',
        },
        // Enterprise Slate Theme
        slate: {
          900: '#0f172a', // Sidebar / Surface Dark
          800: '#1e293b',
          50: '#f8fafc',  // Background Light
        },
        // Semantic Status
        success: '#10b981', // Emerald 500
        warning: '#f59e0b', // Amber 500
        danger: '#ef4444',  // Red 500
      },
      // Animation Config
      animation: {
        'enter': 'enter 0.4s ease-out',
        'leave': 'leave 0.3s ease-in forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        enter: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        leave: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      }, // ปิด keyframes
    }, // ปิด extend
  }, // <--- (สำคัญ) ปิด theme (อันนี้ที่ขาดไปครับ)
  plugins: [require('tailwindcss-animate')],
} satisfies Config