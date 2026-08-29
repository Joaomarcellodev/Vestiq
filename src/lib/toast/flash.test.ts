import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { FLASH_MESSAGES } from "./flash";

describe("FLASH_MESSAGES", () => {
  it("every entry has a message and a valid variant", () => {
    for (const [code, entry] of Object.entries(FLASH_MESSAGES)) {
      expect(entry.message, code).toBeTruthy();
      expect(["success", "error", "info"]).toContain(entry.variant);
    }
  });

  it("covers every `?toast=<code>` used by the Server Actions", () => {
    const out = execSync(`grep -rho 'toast=[a-z-]\\+' src/features src/app || true`, {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    const used = new Set(
      out
        .split("\n")
        .map((l) => l.trim().replace(/^toast=/, ""))
        .filter(Boolean),
    );
    const missing = [...used].filter((code) => !(code in FLASH_MESSAGES));
    expect(missing, `flash codes with no message: ${missing.join(", ")}`).toEqual([]);
  });
});
