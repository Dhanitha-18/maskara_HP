/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A8A', // Deep Blue
          dark: '#1e3a8a',
          light: '#3b82f6',
        },
        background: '#F8FAFC',
        card: '#FFFFFF',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        text: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        card: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
      },
    },
  },
  plugins: [],
}
