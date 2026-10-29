import { z } from "@/lib/zod";

/** VES-65 — "Teresina, PI". Empty clears the city. */
export const organizationCitySchema = z.object({
  city: z
    .string()
    .trim()
    .max(80, "Use no máximo 80 caracteres na cidade")
    .optional()
    .or(z.literal(""))
    .transform((v) => v ?? ""),
});
