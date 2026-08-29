import type { Config } from "tailwindcss";

/**
 * Vestiq Design System — tokens portados de docs/design/vestiq_core/DESIGN.md
 * e do config inline dos prototipos em docs/design/(tela)/code.html.
 *
 * Regra: quando DESIGN.md (prosa) e os prototipos HTML divergem, os prototipos
 * (que geram as telas de referencia) prevalecem. Ver docs/adr/0006-design-tokens.md
 */

const jakarta = ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"];

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#fcf8ff",
        "surface-dim": "#dbd7ec",
        "surface-bright": "#fcf8ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f6f2ff",
        "surface-container": "#f0ebff",
        "surface-container-high": "#eae6fa",
        "surface-container-highest": "#e4e0f4",
        "surface-variant": "#e4e0f4",
        "surface-tint": "#7e38c6",
        "on-surface": "#1b1a28",
        "on-surface-variant": "#4c4453",
        "inverse-surface": "#302f3e",
        "inverse-on-surface": "#f3eeff",
        outline: "#7d7384",
        "outline-variant": "#cec2d5",
        primary: "#56009a",
        "on-primary": "#ffffff",
        "primary-container": "#7027b8",
        "on-primary-container": "#dab6ff",
        "inverse-primary": "#dbb8ff",
        "primary-fixed": "#efdbff",
        "primary-fixed-dim": "#dbb8ff",
        "on-primary-fixed": "#2b0052",
        "on-primary-fixed-variant": "#6415ac",
        secondary: "#b1008a",
        "on-secondary": "#ffffff",
        "secondary-container": "#fe4cca",
        "on-secondary-container": "#5d0047",
        "secondary-fixed": "#ffd8eb",
        "secondary-fixed-dim": "#ffaedd",
        "on-secondary-fixed": "#3b002c",
        "on-secondary-fixed-variant": "#880069",
        tertiary: "#3b3850",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#524f68",
        "on-tertiary-container": "#c6c2e0",
        "tertiary-fixed": "#e4dffe",
        "tertiary-fixed-dim": "#c8c3e1",
        "on-tertiary-fixed": "#1b192f",
        "on-tertiary-fixed-variant": "#47445d",
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        background: "#fcf8ff",
        "on-background": "#1b1a28",
        // Status tints (chips/badges) — DESIGN.md §Chips & Badges
        "success-container": "#d7f0dd",
        "on-success-container": "#0f5132",
        "warning-container": "#ffe9c7",
        "on-warning-container": "#7a4b00",
        "info-container": "#e4dffe",
        "on-info-container": "#3b3850",
      },
      fontFamily: {
        sans: jakarta,
        "display-lg": jakarta,
        "headline-lg": jakarta,
        "headline-lg-mobile": jakarta,
        "headline-md": jakarta,
        "title-lg": jakarta,
        "body-lg": jakarta,
        "body-md": jakarta,
        "label-md": jakarta,
        "label-sm": jakarta,
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "60px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": [
          "32px",
          { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "700" },
        ],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "title-lg": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" }],
        "label-sm": ["11px", { lineHeight: "14px", fontWeight: "500" }],
      },
      spacing: {
        unit: "4px",
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        gutter: "24px",
        "margin-mobile": "16px",
        "margin-desktop": "40px",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
      boxShadow: {
        // DESIGN.md §Elevation & Depth
        surface: "0px 4px 20px rgba(23, 21, 43, 0.04)",
        overlay: "0px 12px 32px rgba(23, 21, 43, 0.08)",
        primary: "0 4px 12px rgba(112, 39, 184, 0.15)",
        "focus-ring": "0 0 0 4px rgba(112, 39, 184, 0.2)",
      },
      maxWidth: {
        "app-mobile": "440px",
      },
      keyframes: {
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "toast-in": "toast-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
