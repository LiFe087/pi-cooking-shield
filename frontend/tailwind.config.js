/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-blue': '#00f5ff',
        'cyber-green': '#00ff41',
        'cyber-red': '#ff0040',
        'dark-bg': '#0a0a0a',
        'dark-card': '#1a1a1a',
      }
    },
  },
  plugins: [],
}