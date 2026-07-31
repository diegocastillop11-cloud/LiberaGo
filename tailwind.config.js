/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--color-surface-2) / <alpha-value>)",
        ink: "rgb(var(--color-text) / <alpha-value>)",
        "ink-muted": "rgb(var(--color-text-muted) / <alpha-value>)",
        line: "rgb(var(--color-border) / <alpha-value>)",
        action: "rgb(var(--color-blue) / <alpha-value>)",
        "action-ink": "rgb(var(--color-blue-ink) / <alpha-value>)",
        "on-action": "rgb(var(--color-on-blue) / <alpha-value>)",
        confirmed: "rgb(var(--color-gold) / <alpha-value>)",
        "confirmed-ink": "rgb(var(--color-gold-ink) / <alpha-value>)",
        "on-confirmed": "rgb(var(--color-on-gold) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        error: "rgb(var(--color-error) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["DM Sans", "sans-serif"],
        data: ["Geist", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
    },
  },
  plugins: [],
};
