/**
 * Supabase-generated types.
 *
 * This file is a placeholder until the first migration lands. After running
 * `npm run db:start` and applying migrations, regenerate with:
 *
 *   npm run db:types
 *
 * Do not edit by hand — it is overwritten by the Supabase CLI.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
