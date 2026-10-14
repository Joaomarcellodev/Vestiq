import { describe, expect, it } from "vitest";
import { z } from "./zod";

function messageOf(schema: z.ZodTypeAny, value: unknown) {
  const result = schema.safeParse(value);
  expect(result.success).toBe(false);
  return result.error!.issues[0]!.message;
}

describe("pt-BR error map (VES-78)", () => {
  it("translates number bounds", () => {
    expect(messageOf(z.coerce.number().min(0), "-5")).toBe("Informe um número maior ou igual a 0");
    expect(messageOf(z.number().positive(), 0)).toBe("Informe um número maior que 0");
    expect(messageOf(z.number().max(10), 11)).toBe("Informe um número menor ou igual a 10");
  });

  it("translates types", () => {
    expect(messageOf(z.coerce.number(), "abc")).toBe("Informe um número");
    expect(messageOf(z.number().int(), 1.5)).toBe("Informe um número inteiro");
    expect(messageOf(z.object({ name: z.string() }), {})).toBe("Campo obrigatório");
  });

  it("translates strings", () => {
    expect(messageOf(z.string().min(1), "")).toBe("Campo obrigatório");
    expect(messageOf(z.string().min(8), "abc")).toBe("Use pelo menos 8 caracteres");
    expect(messageOf(z.string().max(3), "abcd")).toBe("Use no máximo 3 caracteres");
    expect(messageOf(z.string().email(), "x")).toBe("Email inválido");
    expect(messageOf(z.string().uuid(), "x")).toBe("Valor inválido");
    expect(messageOf(z.enum(["A", "B"]), "C")).toBe("Opção inválida");
  });

  it("keeps a message set in the schema", () => {
    expect(messageOf(z.number().min(0, "Custo inválido"), -1)).toBe("Custo inválido");
  });
});
