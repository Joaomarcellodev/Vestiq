/**
 * The dashboard renders on the server (UTC on Netlify), so the hour must be
 * read in Brazil's zone — Vestiq is Brazil-only (BRL — ADR-0008).
 */
export const DASHBOARD_TIME_ZONE = "America/Sao_Paulo";

const hourFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: DASHBOARD_TIME_ZONE,
  hour: "numeric",
  hourCycle: "h23",
});

/** "Bom dia" from 5h to 11h59, "Boa tarde" from 12h to 17h59, "Boa noite" otherwise. */
export function greeting(now = new Date()): string {
  const hour = Number(hourFormat.format(now));
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}
