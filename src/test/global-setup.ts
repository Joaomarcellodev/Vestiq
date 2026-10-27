import type { GlobalSetupContext } from "vitest/node";
import { cleanTestData } from "../../scripts/clean-test-data.mjs";

/**
 * VES-94 — once the run ends, remove the users, organizations and data the
 * integration suites created. Uses the run's env, so it only ever touches the
 * local stack (the script refuses any other URL).
 */
export default function setup({ config }: GlobalSetupContext) {
  return async () => {
    await cleanTestData({
      url: config.env.NEXT_PUBLIC_SUPABASE_URL,
      secretKey: config.env.SUPABASE_SECRET_KEY,
    });
  };
}
