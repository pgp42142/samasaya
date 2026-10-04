import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/env";

// Uses the service role key, which bypasses row-level security.
// Only import this from server code.
export function createAdminClient() {
  return createClient(
    supabaseUrl(),
    supabaseServiceRoleKey(),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
