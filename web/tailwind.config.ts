import type { Config } from "tailwindcss";

/**
 * Design system — warm parlor aesthetic (see docs/ui-design-spec.md).
 * Semantic tokens for app chrome; game board uses container-scaled tiles (globals.css).
 */
const withAlpha = (r: number, g: number, b: number) =>
  `rgb(${r} ${g} ${b} / <alpha-value>)` as const;

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: withAlpha(13, 15, 20),
        foreground: withAlpha(232, 223, 208),
        surface: withAlpha(26, 43, 30),
        elevated: withAlpha(36, 53, 40),
        muted: withAlpha(30, 40, 36),
        "muted-foreground": withAlpha(168, 155, 140),
        card: withAlpha(30, 44, 36),
        "card-foreground": withAlpha(232, 223, 208),
        popover: withAlpha(28, 38, 32),
        "popover-foreground": withAlpha(232, 223, 208),
        border: withAlpha(42, 53, 48),
        input: withAlpha(60, 72, 66),
        ring: withAlpha(201, 168, 76),
        accent: withAlpha(201, 168, 76),
        "accent-foreground": withAlpha(26, 18, 8),
        success: withAlpha(93, 175, 106),
        "success-foreground": withAlpha(12, 28, 16),
        info: withAlpha(91, 159, 168),
        "info-foreground": withAlpha(12, 24, 28),
        highlight: withAlpha(232, 197, 90),
        "highlight-foreground": withAlpha(26, 18, 8),
        destructive: withAlpha(199, 91, 74),
        "destructive-foreground": withAlpha(255, 248, 240),
        chart: {
          "1": withAlpha(201, 168, 76),
          "2": withAlpha(93, 175, 106),
          "3": withAlpha(78, 173, 160),
          "4": withAlpha(199, 91, 74),
          "5": withAlpha(168, 155, 140),
        },
        mahjong: {
          green: "#2D5016",
          red: "#B71C1C",
          gold: "#C9A84C",
          jade: "#4EADA0",
          wood: "#5C3D2E",
          felt: "#2E5938",
        },
        tile: {
          bg: "#FFF8E1",
          border: "#8B7355",
        },
        suit: {
          bamboo: "#2E7D32",
          character: "#B71C1C",
          dot: "#1565C0",
          honor: "#5C4632",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        heading: ["var(--font-display)", "Georgia", "serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        caption: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
        body: ["0.9375rem", { lineHeight: "1.5rem" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.625rem" }],
        "title-sm": ["1.125rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em" }],
        title: ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.02em" }],
        "title-lg": ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.02em" }],
        display: ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.03em" }],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "24px",
      },
      boxShadow: {
        "ds-xs": "0 1px 2px rgb(0 0 0 / 0.22)",
        "ds-sm": "0 2px 8px rgb(0 0 0 / 0.18), 0 1px 2px rgb(0 0 0 / 0.12)",
        "ds-md": "0 8px 24px rgb(0 0 0 / 0.24), 0 2px 6px rgb(0 0 0 / 0.14)",
        "ds-lg": "0 16px 48px rgb(0 0 0 / 0.32), 0 4px 12px rgb(0 0 0 / 0.18)",
        "ds-inset": "inset 0 1px 0 rgb(255 255 255 / 0.06)",
        "ds-ring-gold": "0 0 0 3px rgb(201 168 76 / 0.4)",
        "ds-ring-jade": "0 0 0 3px rgb(78 173 160 / 0.35)",
        "tile-rest": "1px 2px 0 0 #C4B896, 2px 3px 6px rgb(0 0 0 / 0.22)",
        "tile-selected": "inset 0 1px 3px rgb(0 0 0 / 0.12), 0 0 0 2px rgb(201 168 76 / 0.55)",
      },
      transitionDuration: {
        instant: "100ms",
        fast: "180ms",
        normal: "260ms",
        slow: "400ms",
        slower: "600ms",
      },
      transitionTimingFunction: {
        "ds-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "ds-in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
        "ds-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
