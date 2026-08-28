import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("Email inválido"),
  birthDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida")
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Data inválida")
    .refine((v) => !v || new Date(v) <= new Date(), "A data não pode ser no futuro"),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
