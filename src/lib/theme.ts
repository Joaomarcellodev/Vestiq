export type Theme = "light" | "dark" | "system";

export const THEME_COOKIE = "vestiq-theme";
export const THEMES: Theme[] = ["light", "dark", "system"];

/** Runs in <head> before paint to set the theme class and avoid a flash. */
export const THEME_SCRIPT = `(function(){try{
var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]+)/);
var t=m?decodeURIComponent(m[1]):"system";
var dark=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var c=document.documentElement.classList;
c.toggle("dark",dark);c.toggle("light",!dark);
}catch(e){}})();`;

/** Whether the given preference resolves to dark right now. */
export function resolvesToDark(theme: Theme): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Applies a preference to <html> immediately (client only). */
export function applyTheme(theme: Theme): void {
  const dark = resolvesToDark(theme);
  const cls = document.documentElement.classList;
  cls.toggle("dark", dark);
  cls.toggle("light", !dark);
}

export function persistTheme(theme: Theme): void {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function readThemeCookie(): Theme {
  if (typeof document === "undefined") return "system";
  const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]+)`));
  const value = m ? decodeURIComponent(m[1]!) : "system";
  return value === "light" || value === "dark" ? value : "system";
}
