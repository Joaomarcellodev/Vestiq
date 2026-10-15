import { describe, expect, it } from "vitest";
import { formatCPF, isValidCPF } from "./cpf";

describe("isValidCPF", () => {
  it("accepts valid CPFs (with and without mask)", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
    // check digit resolves to 0 via the `mod === 10 ? 0` branch
    expect(isValidCPF("00000000604")).toBe(true);
    expect(isValidCPF("00000001830")).toBe(true);
  });

  it("rejects invalid CPFs", () => {
    expect(isValidCPF("111")).toBe(false);
    expect(isValidCPF("00000000000")).toBe(false);
    expect(isValidCPF("11111111111")).toBe(false);
    expect(isValidCPF("529.982.247-24")).toBe(false);
    expect(isValidCPF("")).toBe(false);
  });

  it("formats a CPF", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
  });

  it("masks a partial CPF while typing (VES-80)", () => {
    expect(formatCPF("529")).toBe("529");
    expect(formatCPF("5299")).toBe("529.9");
    expect(formatCPF("5299822")).toBe("529.982.2");
    expect(formatCPF("5299822472")).toBe("529.982.247-2");
    expect(formatCPF("529.982.247-255")).toBe("529.982.247-25");
  });
});
