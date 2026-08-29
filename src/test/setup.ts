import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

const hasDOM = typeof document !== "undefined";

// Env comes from vitest.config.ts (`test.env`, which reads .env.local).

// --- jsdom polyfills used by `motion` and `recharts` -----------------------
if (hasDOM) {
  if (!("IntersectionObserver" in globalThis)) {
    class IO {
      private cb: IntersectionObserverCallback;
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb;
      }
      observe(el: Element) {
        this.cb(
          [{ isIntersecting: true, target: el, intersectionRatio: 1 } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    globalThis.IntersectionObserver = IO as unknown as typeof IntersectionObserver;
  }
  if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
}

// --- Next.js shims for the test environment ---------------------------------
// Kept here so every test file gets them without repeating `vi.mock`.
// (`server-only` is aliased to a stub in vitest.config.ts.)

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock("next/navigation", async () => {
  const { _pathname, _searchParams, routerSpy, RedirectError, NotFoundError } =
    await import("./next");
  return {
    redirect: (destination: string) => {
      throw new RedirectError(destination);
    },
    permanentRedirect: (destination: string) => {
      throw new RedirectError(destination);
    },
    notFound: () => {
      throw new NotFoundError();
    },
    useRouter: () => routerSpy,
    usePathname: () => _pathname(),
    useSearchParams: () => _searchParams(),
    useParams: () => ({}),
    redirect_RedirectError: RedirectError,
    redirect_NotFoundError: NotFoundError,
  };
});

vi.mock("next/headers", async () => {
  const { _cookies, _headers } = await import("./next");
  return {
    cookies: async () => _cookies(),
    headers: async () => _headers(),
    draftMode: async () => ({ isEnabled: false }),
  };
});

vi.mock("@/lib/supabase/server", async () => {
  const { _currentClient } = await import("./actions");
  return { createClient: async () => _currentClient() };
});

afterEach(async () => {
  if (hasDOM) {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
  vi.clearAllMocks();
  const { resetNext } = await import("./next");
  const { clearTestClient } = await import("./actions");
  resetNext();
  clearTestClient();
});
