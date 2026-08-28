import { z } from "zod";
import { isValidCPF } from "@/lib/utils/cpf";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do cliente").max(120),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  document: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isValidCPF(v), "CPF inválido"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;
