/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg:            "var(--color-bg)",
        surface:       "var(--color-surface)",
        card:          "var(--color-card)",
        "card-hover":  "var(--color-card-hover)",
        elevated:      "var(--color-elevated)",
        border:        "var(--color-border)",
        "border-light":"var(--color-border-light)",
        accent:        "#4F8EF7",
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