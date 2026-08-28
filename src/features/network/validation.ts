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
