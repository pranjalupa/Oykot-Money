import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client, for the one job that needs it: removing a login when
 * someone deletes their account. Never imported by anything that runs in the
 * browser — the key bypasses every access rule.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin credentials are not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
