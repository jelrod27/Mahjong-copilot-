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
          bg: "#1a1a2e",
          bgLight: "#16213e",
          panel: "#0f3460",
          border: "#e94560",
          accent: "#e94560",
          gold: "#f0c040",
          green: "#00d474",
          cyan: "#53d8fb",
          text: "#e0e0e0",
          textDim: "#7a7a8e",
          white: "#f5f5f5",
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        retro: ['"VT323"', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace'],
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
