import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/** Load .env.local so integration tests can reach the local Supabase stack. */
function envLocal(): Record<string, string> {
  try {
    const raw = readFileSync(new URL("./.env.local", import.meta.url), "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m?.[1]) out[m[1]] = (m[2] ?? "").replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // vitest runs in Node — the `server-only` guard is a no-op here.
      "server-only": fileURLToPath(new URL("./src/test/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    // Integration tests hit the real Supabase + Storage; run them in Node so
    // `File`/`fetch` are the built-ins undici expects (jsdom's File breaks uploads).
    environmentMatchGlobs: [["src/**/*.integration.test.{ts,tsx}", "node"]],
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Local Supabase / GoTrue occasionally returns a transient
    // "Database error creating new user" under heavy parallel load.
    retry: process.env.CI ? 2 : 1,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54421",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      ...envLocal(),
    },
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/test/**",
        "src/types/**",
        "src/**/*.d.ts",
        // --- glue covered by Playwright E2E, not by vitest ------------------
        // Server Components / route composition — exercised end-to-end.
        "src/app/**/{layout,loading,error,not-found,page}.tsx",
        "src/app/**/route.ts",
        // Thin factories / framework wiring.
        "src/lib/supabase/**",
        "src/proxy.ts",
        "src/lib/env.ts",
        "src/**/index.ts",
      ],
      thresholds: {
        // Enforced floor for the business-logic + component set (actuals are
        // ~98% lines / ~81% branches). Ratchet up as coverage improves; do not
        // lower without a note in the PR. Requires the local Supabase stack —
        // the *.integration.test.ts suites skip (and coverage drops) without it.
        statements: 95,
        lines: 95,
        functions: 88,
        branches: 79,
      },
    },
  },
});
