"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "./icon";
import { applyTheme, persistTheme, readThemeCookie, type Theme } from "@/lib/theme";

const NEXT: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
const META: Record<Theme, { icon: string; label: string }> = {
  light: { icon: "sun", label: "Tema claro" },
  dark: { icon: "moon", label: "Tema escuro" },
  system: { icon: "devices", label: "Tema do sistema" },
};

/**
 * Cycles light → dark → system. `variant="button"` renders a labelled row for
 * the profile page; `variant="icon"` a compact control for the top bar/sidebar.
 */
export function ThemeToggle({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "button";
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read the persisted preference only after mount so SSR and the first
    // client render agree (avoids a hydration mismatch on the icon).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readThemeCookie());
    setMounted(true);
  }, []);

  // Keep following the OS while the preference is "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const cycle = () => {
    const next = NEXT[theme];
    setTheme(next);
    persistTheme(next);
    applyTheme(next);
  };

  const current = mounted ? theme : "system";
  const meta = META[current];

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={cycle}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-left transition-colors hover:bg-surface-container-low",
          className,
        )}
      >
        <span className="flex items-center gap-3">
          <Icon name={meta.icon} size={20} className="text-on-surface-variant" />
          <span className="font-body-md text-body-md text-on-surface">{meta.label}</span>
        </span>
        <span className="font-label-md text-label-md text-on-surface-variant">Trocar</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={meta.label}
      title={meta.label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container",
        className,
      )}
    >
      <Icon name={meta.icon} size={20} />
    </button>
  );
}
