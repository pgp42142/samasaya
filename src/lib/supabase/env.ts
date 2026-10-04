// Supabase settings, with any whitespace removed. Keys and URLs never contain
// whitespace, but a value pasted into a hosting dashboard can pick up a line
// break, and a key with a line break is an invalid HTTP header: every request
// then fails in fetch() before it is sent.
//
// process.env.NEXT_PUBLIC_* must be written out literally so Next.js can
// inline them into the browser bundle.

function clean(value: string | undefined, name: string): string {
  const cleaned = value?.replace(/\s+/g, "");
  if (!cleaned) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return cleaned;
}

export const supabaseUrl = () =>
  clean(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");

export const supabaseAnonKey = () =>
  clean(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );

// Server only: bypasses row-level security.
export const supabaseServiceRoleKey = () =>
  clean(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
