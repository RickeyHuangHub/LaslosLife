import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        la: {
          bg: "#1A1A2E",
          card: "#16213E",
          pink: "#FF6B9D",
          gold: "#FFD93D",
          hunger: "#FF8E72",
          energy: "#4D96FF",
          mental: "#9B7BFF",
          beauty: "#6BCB9F",
          aura: "#E8C547",
        },
      },
      fontFamily: {
        display: ["Outfit", "system-ui", "sans-serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pulse-warning": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        marquee: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "glow-low": {
          "0%, 100%": { boxShadow: "0 0 8px currentColor" },
          "50%": { boxShadow: "0 0 18px currentColor" },
        },
      },
      animation: {
        "pulse-warning": "pulse-warning 1.5s ease-in-out infinite",
        marquee: "marquee 18s linear infinite",
        "glow-low": "glow-low 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
