import { z } from "zod";

export const createNetworkSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da rede").max(120),
});

export const inviteResellerSchema = z.object({
  networkId: z.string().uuid(),
  email: z.string().trim().email("Email inválido"),
});

export const acceptInviteSchema = z.object({
  token: z.string().uuid("Convite inválido"),
  resellerName: z.string().trim().max(120).optional().or(z.literal("")),
});

/** VES-95 — create the reseller's account from the invite link. */
export const inviteSignupSchema = z
  .object({
    token: z.string().uuid("Convite inválido"),
    resellerName: z.string().trim().min(1, "Informe o nome da sua loja.").max(120),
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
    confirm: z.string().min(1, "Confirme a senha."),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  });
