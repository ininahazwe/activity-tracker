/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0E14",
        surface: "#12151E",
        card: "#171B26",
        "card-hover": "#1C2030",
        elevated: "#1E2233",
        border: "#232838",
        "border-light": "#2D3348",
        accent: "#4F8EF7",
        "accent-dark": "#3A6FD4",
        "accent-soft": "rgba(79,142,247,0.10)",
      },
      fontFamily: {
        sans: ["DM Sans", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
