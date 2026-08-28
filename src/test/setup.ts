import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Public env used by src/lib/env.ts during tests.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "test-publishable-key";
process.env.NEXT_PUBLIC_SITE_URL ??= "http://localhost:3000";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
