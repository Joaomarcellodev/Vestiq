import { z } from "zod";

/** RF-AUTH-001 — credential sign-in. */
export const credentialsSchema = z.object({
  email: z.string().min(1, "Informe seu email.").email("Email inválido."),
  password: z.string().min(1, "Informe sua senha."),
  remember: z.coerce.boolean().optional().default(false),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export const oauthProviderSchema = z.enum(["google", "apple"]);
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
