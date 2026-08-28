import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge configured with Vestiq's custom theme so it can tell a
 * font-size utility (`text-body-lg`) apart from a text-color utility
 * (`text-on-primary`). Without this, `cn("text-on-primary", "text-body-lg")`
 * silently drops the color.
 */
const FONT_SIZES = [
  "display-lg",
  "headline-lg",
  "headline-lg-mobile",
  "headline-md",
  "title-lg",
  "body-lg",
  "body-md",
  "label-md",
  "label-sm",
];

const COLORS = [
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
  "success-container",
  "on-success-container",
  "warning-container",
  "on-warning-container",
  "info-container",
  "on-info-container",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZES }],
      "text-color": [{ text: COLORS }],
      "bg-color": [{ bg: COLORS }],
      "border-color": [{ border: COLORS }],
      "ring-color": [{ ring: COLORS }],
    },
  },
});

/** Merge conditional class names, resolving Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
