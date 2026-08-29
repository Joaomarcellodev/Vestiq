import { vi } from "vitest";

/**
 * Mutable state behind the `next/navigation` and `next/headers` mocks
 * installed in `src/test/setup.ts`. Component and action tests drive routing
 * and cookies through these setters.
 */

let pathname = "/";
let searchParams = new URLSearchParams();
const cookieStore = new Map<string, string>();
const headerStore = new Map<string, string>();

export const routerSpy = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

export function setPathname(value: string): void {
  pathname = value;
}
export function setSearchParams(value: string | URLSearchParams): void {
  searchParams = typeof value === "string" ? new URLSearchParams(value) : value;
}
export function setCookie(name: string, value: string): void {
  cookieStore.set(name, value);
}
export function setHeader(name: string, value: string): void {
  headerStore.set(name.toLowerCase(), value);
}

export function resetNext(): void {
  pathname = "/";
  searchParams = new URLSearchParams();
  cookieStore.clear();
  headerStore.clear();
  Object.values(routerSpy).forEach((fn) => fn.mockClear());
}

// --- accessors used by the mock factories in setup.ts -----------------------

export function _pathname(): string {
  return pathname;
}
export function _searchParams(): URLSearchParams {
  return searchParams;
}
export function _cookies() {
  return {
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined,
    getAll: () => [...cookieStore.entries()].map(([name, value]) => ({ name, value })),
    has: (name: string) => cookieStore.has(name),
    set: (name: string, value: string) => cookieStore.set(name, value),
    delete: (name: string) => cookieStore.delete(name),
  };
}
export function _headers() {
  return {
    get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
    has: (name: string) => headerStore.has(name.toLowerCase()),
    entries: () => headerStore.entries(),
  };
}

// --- redirect / notFound sentinels -----------------------------------------

export class RedirectError extends Error {
  destination: string;
  constructor(destination: string) {
    super(`NEXT_REDIRECT: ${destination}`);
    this.name = "RedirectError";
    this.destination = destination;
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
    this.name = "NotFoundError";
  }
}
