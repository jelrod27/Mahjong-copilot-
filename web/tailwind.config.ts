import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        mahjong: {
          green: "#2D5016",
          red: "#B71C1C",
          gold: "#D4AF37",
        },
        tile: {
          bg: "#FFF8E1",
          border: "#424242",
        },
        suit: {
          bamboo: "#4CAF50",
          character: "#B71C1C",
          dot: "#2196F3",
          honor: "#9E9E9E",
        },
        surface: {
          DEFAULT: "#F5F5F5",
          dark: "#1E1E1E",
        },
        success: "#2E7D32",
        error: "#B71C1C",
        retro: {
          bg: "#110e1a",
          bgLight: "#1c1829",
          panel: "#2a2240",
          border: "#e8384f",
          accent: "#e8384f",
          gold: "#f5b731",
          green: "#2ed8a3",
          cyan: "#45b7d1",
          text: "#ede4d3",
          textDim: "#958a84",
          white: "#f7f0e3",
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        retro: ['"Chakra Petch"', 'sans-serif'],
        pixel: ['"Orbitron"', 'sans-serif'],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
