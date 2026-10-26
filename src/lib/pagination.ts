/**
 * VES-90 — page-numbered lists (`?pagina=N`). Each query asks for one row more
 * than the page holds: that extra row only tells whether a next page exists.
 * Pure, no I/O.
 */

export const PAGE_SIZE = 20;

export interface Page<T> {
  items: T[];
  /** 1-based. */
  page: number;
  hasNext: boolean;
}

/** `?pagina=` from the URL; anything that isn't a whole number ≥ 1 means page 1. */
export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** The inclusive `.range(from, to)` for a page — one row past it, see `pageOf`. */
export function pageRange(page: number, size = PAGE_SIZE): [from: number, to: number] {
  const from = (page - 1) * size;
  return [from, from + size];
}

/** Cuts the extra row off and records whether there was one. */
export function pageOf<T>(rows: T[], page: number, size = PAGE_SIZE): Page<T> {
  return { items: rows.slice(0, size), page, hasNext: rows.length > size };
}

/** Link to `page` keeping the other params (search, tabs); page 1 drops `pagina`. */
export function pageHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "pagina") qs.set(k, v);
  if (page > 1) qs.set("pagina", String(page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}
