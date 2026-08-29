import { z } from "zod";

/** RF-AUTH-001 — credential sign-in. */
export const credentialsSchema = z.object({
  email: z.string().min(1, "Informe seu email.").email("Email inválido."),
  password: z.string().min(1, "Informe sua senha."),
  remember: z.coerce.boolean().optional().default(false),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export const oauthProviderSchema = z.enum(["google"]);
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;

/** RF-AUTH-005 — request a password-reset email. */
export const resetRequestSchema = z.object({
  email: z.string().min(1, "Informe seu email.").email("Email inválido."),
});

/** RF-AUTH-005 — set a new password from the recovery link. */
export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
    confirm: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  });
