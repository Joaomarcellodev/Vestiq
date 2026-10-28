// VES-94 — after the E2E run, remove what the specs created (local database only).
// Runs the script in its own node process: Playwright compiles this file to
// CommonJS, which can't load the ES module directly.
import { execFileSync } from "node:child_process";

export default function globalTeardown() {
  execFileSync(process.execPath, ["scripts/clean-test-data.mjs"], { stdio: "inherit" });
}
