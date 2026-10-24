import { z } from "@/lib/zod";

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

/**
 * VES-92 — change the password from the profile: the current one, plus the
 * same rules as the reset (RF-AUTH-005: at least 8 characters, confirmed).
 */
export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
    confirm: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  })
  .refine((d) => d.password !== d.current, {
    message: "A nova senha precisa ser diferente da atual.",
    path: ["password"],
  });
