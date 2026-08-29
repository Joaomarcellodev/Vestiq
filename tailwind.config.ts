import type { Config } from "tailwindcss";

/**
 * Vestiq Design System — tokens portados de docs/design/vestiq_core/DESIGN.md
 * e do config inline dos prototipos em docs/design/(tela)/code.html.
 *
 * Regra: quando DESIGN.md (prosa) e os prototipos HTML divergem, os prototipos
 * (que geram as telas de referencia) prevalecem. Ver docs/adr/0006-design-tokens.md
 */

const jakarta = ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"];

/**
 * Maps design-token names to `rgb(var(--color-<name>) / <alpha-value>)` so the
 * palette lives in CSS (`globals.css`) and can be swapped per theme.
 */
function withVars(names: string[]): Record<string, string> {
  return Object.fromEntries(
    names.map((name) => [name, `rgb(var(--color-${name}) / <alpha-value>)`]),
  );
}

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: withVars([
        "surface",
        "surface-dim",
        "surface-bright",
        "surface-container-lowest",
        "surface-container-low",
        "surface-container",
        "surface-container-high",
        "surface-container-highest",
        "surface-variant",
        "surface-tint",
        "on-surface",
        "on-surface-variant",
        "inverse-surface",
        "inverse-on-surface",
        "outline",
        "outline-variant",
        "primary",
        "on-primary",
        "primary-container",
        "on-primary-container",
        "inverse-primary",
        "primary-fixed",
        "primary-fixed-dim",
        "on-primary-fixed",
        "on-primary-fixed-variant",
        "secondary",
        "on-secondary",
        "secondary-container",
        "on-secondary-container",
        "secondary-fixed",
        "secondary-fixed-dim",
        "on-secondary-fixed",
        "on-secondary-fixed-variant",
        "tertiary",
        "on-tertiary",
        "tertiary-container",
        "on-tertiary-container",
        "tertiary-fixed",
        "tertiary-fixed-dim",
        "on-tertiary-fixed",
        "on-tertiary-fixed-variant",
        "error",
        "on-error",
        "error-container",
        "on-error-container",
        "background",
        "on-background",
        // Status tints (chips/badges) — DESIGN.md §Chips & Badges
        "success-container",
        "on-success-container",
        "warning-container",
        "on-warning-container",
        "info-container",
        "on-info-container",
      ]),
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
