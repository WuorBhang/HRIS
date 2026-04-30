/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* Global tokens */
        border: "#E5E7EB",
        background: "#F5F7FA",
        foreground: "#111827",

        /* Brand colors */
        primary: {
          DEFAULT: "#1B4F72",   // SafiHub Navy
          foreground: "#FFFFFF",
        },

        accent: {
          DEFAULT: "#F39C12",   // SafiHub Gold
          foreground: "#FFFFFF",
        },

        sidebar: {
          DEFAULT: "#1B4F72",
          foreground: "#F5F7FA",
        },

        muted: {
          DEFAULT: "#E5E7EB",
          foreground: "#6B7280",
        },

        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#111827",
        },

        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
      },

      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
};