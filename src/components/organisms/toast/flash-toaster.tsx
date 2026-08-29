"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FLASH_MESSAGES } from "@/lib/toast/flash";
import { useToast } from "./toast-provider";

/**
 * Turns a `?toast=<code>` query param (set by redirecting Server Actions) into a
 * toast, then removes the param from the URL.
 */
export function FlashToaster() {
  const { toast } = useToast();
  const router = useRouter();
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
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, toast]);

  return null;
}
