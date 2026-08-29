"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top progress bar that gives instant feedback while navigating between
 * routes. Starts on same-origin link clicks and completes once the new
 * pathname/search renders. Pairs with `(app)/loading.tsx` for slower segments.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const push = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    setProgress(100);
    push(() => setVisible(false), 220);
    push(() => setProgress(0), 460);
  }, [clearTimers, push]);

  const start = useCallback(() => {
    clearTimers();
    setVisible(true);
    setProgress(10);
    push(() => setProgress(45), 120);
    push(() => setProgress(70), 380);
    push(() => setProgress(88), 900);
    push(finish, 12000); // safety net — never hang forever
  }, [clearTimers, push, finish]);

  // Complete whenever the route actually changes.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(finish, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Start on same-origin navigations triggered by a link.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;

      start();
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [start]);

  useEffect(() => clearTimers, [clearTimers]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease" }}
    >
      <div
        className="h-full bg-primary-container shadow-[0_0_8px_rgba(112,39,184,0.5)]"
        style={{ width: `${progress}%`, transition: "width 300ms ease" }}
      />
    </div>
  );
}
