"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FLASH_MESSAGES } from "@/lib/toast/flash";
import { useToast } from "./toast-provider";

/** Whether this document was loaded by the browser's reload (F5, ⌘R). */
function isReload(): boolean {
  if (typeof performance === "undefined" || !performance.getEntriesByType) return false;
  const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return nav?.type === "reload";
}

/**
 * Turns a `?toast=<code>` query param (set by redirecting Server Actions) into a
 * toast, then removes the param from the URL.
 *
 * The param is stripped with `history.replaceState` (which Next keeps in sync
 * with `useSearchParams`) rather than `router.replace`: a router navigation
 * refetches the page, and when the user acts right after the toast that stale
 * fetch can land after the next Server Action's redirect and paint old data.
 *
 * VES-87: Next's router still holds the URL it navigated to, `?toast` included,
 * and writes it back after a later inline Server Action. Moving the router off
 * it (a replaceState without Next's `__NA` mark) costs a history-traversal
 * refetch that can turn into a full page load — it broke the live negotiation
 * chat. So the flash is just never shown for a reloaded page: the reload only
 * repeats the URL, it isn't news.
 */
export function FlashToaster() {
  const { toast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef<string | null>(null);
  // Only the document's first URL came from the reload; later navigations are new.
  const firstUrlReloaded = useRef<boolean | null>(null);

  useEffect(() => {
    if (firstUrlReloaded.current === null) firstUrlReloaded.current = isReload();
    const reloaded = firstUrlReloaded.current;
    firstUrlReloaded.current = false;

    const code = searchParams.get("toast");
    if (!code || handled.current === code) return;
    handled.current = code;

    const entry = FLASH_MESSAGES[code];
    if (entry && !reloaded) toast(entry);

    const next = new URLSearchParams(searchParams);
    next.delete("toast");
    const qs = next.toString();
    // Keep Next's own history state: dropping it makes the next router.refresh()
    // fall back to a full page load.
    window.history.replaceState(window.history.state, "", qs ? `${pathname}?${qs}` : pathname);
  }, [searchParams, pathname, toast]);

  return null;
}
