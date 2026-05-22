import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "ha-bg": "var(--color-bg)",
        "ha-surface": "var(--color-surface)",
        "ha-surface-2": "var(--color-surface-2)",
        "ha-border": "var(--color-border)",
        "ha-text": "var(--color-text)",
        "ha-muted": "var(--color-muted)",
        "ha-accent": "var(--color-accent)",
        "ha-success": "var(--color-success)",
        "ha-warning": "var(--color-warning)",
        "ha-danger": "var(--color-danger)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
