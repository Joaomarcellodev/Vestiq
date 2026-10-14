import { z } from "@/lib/zod";
import { isValidCPF } from "@/lib/utils/cpf";
import { isValidPhone } from "@/lib/utils/phone";

const onlyDigits = (v: string | undefined) => (v ?? "").replace(/\D/g, "");

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do cliente").max(120),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  // VES-80 — phone and CPF are stored as digits; the form and the pages mask them.
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isValidPhone(v), "Telefone inválido: informe DDD + número")
    .transform(onlyDigits),
  document: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isValidCPF(v), "CPF inválido")
    .transform(onlyDigits),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;
