import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Env comes from vitest.config.ts (`test.env`, which reads .env.local).

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
