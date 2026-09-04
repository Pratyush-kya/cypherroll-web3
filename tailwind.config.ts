import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F172A",
        foreground: "#F8FAFC",
        card: {
          DEFAULT: "#1E293B",
          foreground: "#F8FAFC",
        },
        popover: {
          DEFAULT: "#1E293B",
          foreground: "#F8FAFC",
        },
        primary: {
          DEFAULT: "#F59E0B",
          foreground: "#020617",
        },
        secondary: {
          DEFAULT: "#FBBF24",
          foreground: "#020617",
        },
        cta: {
          DEFAULT: "#8B5CF6",
          foreground: "#FFFFFF",
          hover: "#7C3AED",
        },
        accent: {
          green: "#10B981",
          red: "#EF4444",
        },
        muted: {
          DEFAULT: "#334155",
          foreground: "#94A3B8",
        },
        border: "#334155",
      },
      fontFamily: {
        heading: ["Orbitron", "sans-serif"],
        body: ["Exo 2", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
