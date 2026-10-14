import { describe, expect, it } from "vitest";
import { NOT_ALLOWED, rpcErrorMessage, SIGNED_OUT, UNEXPECTED } from "./errors";

describe("rpcErrorMessage (VES-79)", () => {
  it("shows a raised message whole, colon included", () => {
    expect(rpcErrorMessage({ code: "P0001", message: "Estoque insuficiente: saldo atual 8" })).toBe(
      "Estoque insuficiente: saldo atual 8",
    );
    expect(rpcErrorMessage({ code: "23514", message: "Estoque insuficiente: saldo atual 8" })).toBe(
      "Estoque insuficiente: saldo atual 8",
    );
    expect(rpcErrorMessage({ code: "P0001", message: "Ação desconhecida: foo" })).toBe(
      "Ação desconhecida: foo",
    );
  });

  it("translates the English guards", () => {
    expect(rpcErrorMessage({ code: "P0001", message: "not authorized" })).toBe(NOT_ALLOWED);
    expect(rpcErrorMessage({ code: "42501", message: "permission denied for table offers" })).toBe(
      NOT_ALLOWED,
    );
    expect(rpcErrorMessage({ code: "P0001", message: "not authenticated" })).toBe(SIGNED_OUT);
  });

  it("hides any other database error behind a generic message", () => {
    expect(
      rpcErrorMessage({ code: "23503", message: 'insert or update on table "x" violates ...' }),
    ).toBe(UNEXPECTED);
    expect(
      rpcErrorMessage({
        code: "23514",
        message: 'new row for relation "offers" violates check constraint "offers_quantity_check"',
      }),
    ).toBe(UNEXPECTED);
    expect(rpcErrorMessage({ message: "TypeError: fetch failed" })).toBe(UNEXPECTED);
  });
});
