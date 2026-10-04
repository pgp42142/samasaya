import "server-only";
import { createClient } from "@supabase/supabase-js";

// Uses the service role key, which bypasses row-level security.
// Only import this from server code.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
