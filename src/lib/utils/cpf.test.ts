import { describe, expect, it } from "vitest";
import { formatCPF, isValidCPF } from "./cpf";

describe("isValidCPF", () => {
  it("accepts valid CPFs (with and without mask)", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
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
});
