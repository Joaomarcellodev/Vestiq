import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  persistTheme,
  readThemeCookie,
  resolvesToDark,
  THEME_COOKIE,
  THEME_SCRIPT,
  THEMES,
} from "./theme";

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("theme helpers", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("exposes the three preferences", () => {
    expect(THEMES).toEqual(["light", "dark", "system"]);
  });

  describe("resolvesToDark", () => {
    it("is deterministic for explicit choices", () => {
      expect(resolvesToDark("dark")).toBe(true);
      expect(resolvesToDark("light")).toBe(false);
    });
    it("follows the OS for 'system'", () => {
      mockMatchMedia(true);
      expect(resolvesToDark("system")).toBe(true);
      mockMatchMedia(false);
      expect(resolvesToDark("system")).toBe(false);
    });
  });

  describe("applyTheme", () => {
    it("adds .dark and removes .light for a dark preference", () => {
      applyTheme("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light")).toBe(false);
    });
    it("adds .light for a light preference", () => {
      document.documentElement.classList.add("dark");
      applyTheme("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
    it("resolves 'system' via matchMedia", () => {
      mockMatchMedia(true);
      applyTheme("system");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("persistTheme / readThemeCookie", () => {
    it("round-trips a valid value", () => {
      persistTheme("dark");
      expect(readThemeCookie()).toBe("dark");
      persistTheme("light");
      expect(readThemeCookie()).toBe("light");
    });
    it("falls back to 'system' for a missing or unknown cookie", () => {
      expect(readThemeCookie()).toBe("system");
      document.cookie = `${THEME_COOKIE}=purple; path=/`;
      expect(readThemeCookie()).toBe("system");
    });
  });

  describe("THEME_SCRIPT", () => {
    it("is self-contained and references the cookie + matchMedia", () => {
      expect(THEME_SCRIPT).toContain(THEME_COOKIE);
      expect(THEME_SCRIPT).toContain("matchMedia");
      expect(() => new Function(THEME_SCRIPT)).not.toThrow();
    });
  });
});
