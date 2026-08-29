import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

const hasDOM = typeof document !== "undefined";

// Env comes from vitest.config.ts (`test.env`, which reads .env.local).

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
