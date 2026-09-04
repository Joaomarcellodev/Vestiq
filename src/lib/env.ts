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

const parsedPublicEnv = publicSchema.safeParse({
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

if (!parsedPublicEnv.success) {
  // These are read during `next build` (page-data collection), so a missing var
  // aborts the whole build. Report which one, otherwise the failure surfaces as
  // an opaque "Failed to collect page data for /auth/callback".
  const details = parsedPublicEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(
    `Invalid public environment (${details}). ` +
      `Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ` +
      `On Netlify they must be scoped to "Builds" and to the deploy context ` +
      `being built — see docs/DEPLOY.md.`,
  );
}

/** Public env — safe to reference in client and server code. */
export const publicEnv = parsedPublicEnv.data;

/**
 * Server-only env. Import ONLY from server modules ("server-only" guard).
 * Throws if accessed where the secret is not configured.
 */
export function getServerEnv(): z.infer<typeof serverSchema> {
  return serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
}
