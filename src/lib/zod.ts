import { z, ZodIssueCode, type ZodErrorMap } from "zod";

/**
 * VES-78 — Zod's default messages are in English ("Number must be greater than
 * or equal to 0"). This map gives every schema a pt-BR fallback; a message set
 * in the schema itself still wins. Import `z` from here, never from "zod".
 */
export const ptBRErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") {
        return { message: "Campo obrigatório" };
      }
      if (issue.expected === "integer") return { message: "Informe um número inteiro" };
      if (issue.expected === "number") {
        return { message: "Informe um número" };
      }
      return { message: "Valor inválido" };
    case ZodIssueCode.too_small: {
      const min = Number(issue.minimum);
      if (issue.type === "string") {
        return {
          message: min <= 1 ? "Campo obrigatório" : `Use pelo menos ${min} caracteres`,
        };
      }
      if (issue.type === "array") return { message: `Informe pelo menos ${min} item(ns)` };
      if (issue.type === "number" || issue.type === "bigint") {
        return {
          message: issue.inclusive
            ? `Informe um número maior ou igual a ${min}`
            : `Informe um número maior que ${min}`,
        };
      }
      return { message: "Valor muito pequeno" };
    }
    case ZodIssueCode.too_big: {
      const max = Number(issue.maximum);
      if (issue.type === "string") return { message: `Use no máximo ${max} caracteres` };
      if (issue.type === "array") return { message: `Informe no máximo ${max} item(ns)` };
      if (issue.type === "number" || issue.type === "bigint") {
        return {
          message: issue.inclusive
            ? `Informe um número menor ou igual a ${max}`
            : `Informe um número menor que ${max}`,
        };
      }
      return { message: "Valor muito grande" };
    }
    case ZodIssueCode.invalid_string:
      if (issue.validation === "email") return { message: "Email inválido" };
      if (issue.validation === "url") return { message: "URL inválida" };
      return { message: "Valor inválido" };
    case ZodIssueCode.not_multiple_of:
      return { message: "Valor inválido" };
    case ZodIssueCode.invalid_enum_value:
    case ZodIssueCode.invalid_literal:
    case ZodIssueCode.invalid_union:
    case ZodIssueCode.invalid_date:
      return { message: "Opção inválida" };
    default:
      return { message: ctx.defaultError === "Required" ? "Campo obrigatório" : "Valor inválido" };
  }
};

z.setErrorMap(ptBRErrorMap);

export { z };
