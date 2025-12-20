import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F5F1E8',
        brown: {
          dark: '#4A3426',
          medium: '#8B7355',
          light: '#C8B5A0',
        },
        copper: '#C8936E',
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(74, 52, 38, 0.08)',
        'card': '0 4px 12px rgba(74, 52, 38, 0.1)',
      },
    },
  },
  plugins: [],
}
export default config

