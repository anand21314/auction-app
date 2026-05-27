/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <-- Crucial: scans all your components inside src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}