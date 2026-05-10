import type { Config } from "tailwindcss";

/**
 * Design system — semantic tokens, typography, radius, elevation, motion.
 * Prefer `bg-background`, `text-foreground`, `border-border`, `bg-surface`,
 * `bg-elevated`, `text-accent`, `text-success`, `text-info`, `text-highlight`.
 * Component helpers: `ds-panel`, `ds-card`, `ds-btn`, `ds-input` (see globals.css).
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
        background: withAlpha(10, 12, 18),
        foreground: withAlpha(242, 244, 248),
        surface: withAlpha(20, 24, 34),
        elevated: withAlpha(28, 34, 48),
        muted: withAlpha(22, 27, 38),
        "muted-foreground": withAlpha(139, 147, 167),
        card: withAlpha(26, 32, 44),
        "card-foreground": withAlpha(242, 244, 248),
        popover: withAlpha(22, 28, 40),
        "popover-foreground": withAlpha(242, 244, 248),
        border: withAlpha(48, 56, 74),
        input: withAlpha(48, 56, 74),
        ring: withAlpha(129, 140, 248),
        accent: withAlpha(99, 102, 241),
        "accent-foreground": withAlpha(255, 255, 255),
        success: withAlpha(34, 197, 94),
        "success-foreground": withAlpha(6, 24, 12),
        info: withAlpha(56, 189, 248),
        "info-foreground": withAlpha(8, 24, 38),
        highlight: withAlpha(245, 158, 11),
        "highlight-foreground": withAlpha(24, 16, 4),
        destructive: withAlpha(239, 68, 68),
        "destructive-foreground": withAlpha(255, 255, 255),
        chart: {
          "1": withAlpha(129, 140, 248),
          "2": withAlpha(34, 197, 94),
          "3": withAlpha(245, 158, 11),
          "4": withAlpha(244, 63, 94),
          "5": withAlpha(139, 147, 167),
        },
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
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: [
          "var(--font-display)",
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        heading: [
          "var(--font-display)",
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
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
        "ds-xs": "0 1px 2px rgb(0 0 0 / 0.25)",
        "ds-sm": "0 2px 8px rgb(0 0 0 / 0.2), 0 1px 2px rgb(0 0 0 / 0.15)",
        "ds-md": "0 8px 24px rgb(0 0 0 / 0.28), 0 2px 6px rgb(0 0 0 / 0.18)",
        "ds-lg": "0 16px 48px rgb(0 0 0 / 0.35), 0 4px 12px rgb(0 0 0 / 0.2)",
        "ds-inset": "inset 0 1px 0 rgb(255 255 255 / 0.04)",
        "ds-ring-info": "0 0 0 3px rgb(56 189 248 / 0.35)",
        "ds-ring-accent": "0 0 0 3px rgb(99 102 241 / 0.35)",
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
