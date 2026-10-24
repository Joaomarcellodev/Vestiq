"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FLASH_MESSAGES } from "@/lib/toast/flash";
import { useToast } from "./toast-provider";

/**
 * Turns a `?toast=<code>` query param (set by redirecting Server Actions) into a
 * toast, then removes the param from the URL.
 *
 * The param is stripped with `history.replaceState` (which Next keeps in sync
 * with `useSearchParams`) rather than `router.replace`: a router navigation
 * refetches the page, and when the user acts right after the toast that stale
 * fetch can land after the next Server Action's redirect and paint old data.
 */
export function FlashToaster() {
  const { toast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("toast");
    if (!code || handled.current === code) return;
    handled.current = code;

    const entry = FLASH_MESSAGES[code];
    if (entry) toast(entry);

    const next = new URLSearchParams(searchParams);
    next.delete("toast");
    const qs = next.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    // VES-87: Next patches replaceState to move its router to the new URL, but
    // skips that for a state carrying its own `__NA` mark — the router then
    // kept `?toast` and wrote it back on the next Server Action. So the mark is
    // left out (Next copies it and its tree back in), and the call waits a tick:
    // the patch is installed by an effect of the router, which runs after this one.
    setTimeout(() => {
      const { __NA: _mark, ...state } = (window.history.state ?? {}) as Record<string, unknown>;
      window.history.replaceState(state, "", url);
    });
  }, [searchParams, pathname, toast]);

  return null;
}
