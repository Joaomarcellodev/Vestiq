import { describe, expect, it } from "vitest";
import { formatPhone, isValidPhone } from "./phone";

describe("isValidPhone (VES-80)", () => {
  it("accepts a landline or a mobile with DDD, masked or not", () => {
    expect(isValidPhone("1134567890")).toBe(true);
    expect(isValidPhone("11987654321")).toBe(true);
    expect(isValidPhone("(11) 98765-4321")).toBe(true);
    expect(isValidPhone("(21) 3456-7890")).toBe(true);
  });

  it("rejects letters, a wrong length, a missing DDD or a mobile without the 9", () => {
    expect(isValidPhone("abcdef")).toBe(false);
    expect(isValidPhone("11 9876a4321")).toBe(false);
    expect(isValidPhone("987654321")).toBe(false);
    expect(isValidPhone("119876543210")).toBe(false);
    expect(isValidPhone("0198765432")).toBe(false);
    expect(isValidPhone("11887654321")).toBe(false);
  });
});

describe("formatPhone (VES-80)", () => {
  it("masks while typing", () => {
    expect(formatPhone("")).toBe("");
    expect(formatPhone("1")).toBe("(1");
    expect(formatPhone("119")).toBe("(11) 9");
    expect(formatPhone("1134567")).toBe("(11) 3456-7");
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890");
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatPhone("(11) 98765-43210")).toBe("(11) 98765-4321");
  });

  it("leaves an old free-text value as it is", () => {
    expect(formatPhone("abcdef")).toBe("abcdef");
  });
});
