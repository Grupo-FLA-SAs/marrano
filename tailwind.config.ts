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
        // Paleta MARRANO
        felt: {
          50:  '#f0f7f0',
          100: '#d9edd9',
          200: '#b3dab3',
          300: '#7ec07e',
          400: '#4fa04f',
          500: '#2d7d2d',
          600: '#1a5c1a',
          700: '#0f4010',   // verde oscuro principal del paño
          800: '#0a2e0a',
          900: '#061a06',
        },
        ivory: {
          50:  '#fdfdf8',
          100: '#faf9ee',
          200: '#f5f2d9',
          300: '#ede8b8',   // marfil principal
          400: '#e0d891',
          500: '#cfc46a',
        },
        gold: {
          300: '#e8c97a',
          400: '#d4a843',   // dorado envejecido principal
          500: '#b8891e',
          600: '#966d10',
          700: '#7a5508',
        },
        chalk: {
          300: '#9ab3d4',
          400: '#6b93c0',   // azul de tiza
          500: '#4a74a8',
          600: '#355a8a',
        },
        carbon: {
          800: '#1a1a1a',
          900: '#0d0d0d',   // carbón para fondos
          950: '#080808',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'serif'],
      },
      backgroundImage: {
        'felt-texture': "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
      },
    },
  },
  plugins: [],
}

export default config
