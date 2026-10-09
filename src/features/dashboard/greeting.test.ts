import { describe, expect, it } from "vitest";
import { greeting } from "./greeting";

// Brazil is UTC-3, so 15:00Z is 12:00 in São Paulo.
const at = (utc: string) => new Date(`2026-10-08T${utc}Z`);

describe("greeting", () => {
  it("says Bom dia in the morning", () => {
    expect(greeting(at("08:00:00"))).toBe("Bom dia");
    expect(greeting(at("14:59:59"))).toBe("Bom dia");
  });

  it("says Boa tarde from noon (Brazil time), not UTC", () => {
    expect(greeting(at("15:00:00"))).toBe("Boa tarde");
    expect(greeting(at("16:00:00"))).toBe("Boa tarde");
    expect(greeting(at("20:59:59"))).toBe("Boa tarde");
  });

  it("says Boa noite in the evening and before dawn", () => {
    expect(greeting(at("21:00:00"))).toBe("Boa noite");
    expect(greeting(at("03:00:00"))).toBe("Boa noite");
    expect(greeting(at("07:59:59"))).toBe("Boa noite");
  });
});
