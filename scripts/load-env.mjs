import { readFileSync } from "node:fs";

/**
 * Load `.env.local` into process.env for scripts and tests (Next.js does this
 * automatically for the app, but plain node/vitest do not). Existing values win.
 */
export function loadEnvLocal(url = new URL("../.env.local", import.meta.url)) {
  let raw;
  try {
    raw = readFileSync(url, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const [, key, value] = m;
    if (process.env[key] === undefined) {
      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  }
}
