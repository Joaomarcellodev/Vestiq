import { z } from "zod";

/**
 * Runtime env validation. Fails fast at boot if required vars are missing.
 * Server-only secrets must never be prefixed with NEXT_PUBLIC.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
});

/** Public env — safe to reference in client and server code. */
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  // Netlify exposes the deploy URL as `URL` at build time; use it as a fallback
  // so OAuth redirects work in production without extra config.
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.URL ||
    undefined,
});

/**
 * Server-only env. Import ONLY from server modules ("server-only" guard).
 * Throws if accessed where the secret is not configured.
 */
export function getServerEnv(): z.infer<typeof serverSchema> {
  return serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
}
