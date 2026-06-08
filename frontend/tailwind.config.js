/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0b141a', // WhatsApp Web dark bg
          panel: '#111b21',
          panelHover: '#202c33',
          input: '#2a3942',
          primary: '#e9edef',
          secondary: '#8696a0',
          accent: '#00a884', // Emerald branding
        },
        light: {
          bg: '#eae6df',
          panel: '#ffffff',
          panelHover: '#f0f2f5',
          input: '#f0f2f5',
          primary: '#111b21',
          secondary: '#667781',
          accent: '#008069',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
