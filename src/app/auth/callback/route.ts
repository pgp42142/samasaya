import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  const fail = (reason: string, detail: string) => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", reason);
    url.searchParams.set("detail", redact(detail).slice(0, 300));
    return NextResponse.redirect(url);
  };

  if (!code) {
    // Supabase or Google sent the user back with an error instead of a code.
    const detail =
      searchParams.get("error_description") ??
      searchParams.get("error") ??
      "No authorization code in the callback URL.";
    console.error("auth callback: no code", Object.fromEntries(searchParams));
    return fail("auth", detail);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("auth callback: exchangeCodeForSession failed", {
      name: error?.name,
      code: error?.code,
      status: error?.status,
      message: error?.message,
      hasVerifierCookie: request.cookies
        .getAll()
        .some((c) => c.name.endsWith("-code-verifier")),
    });
    return fail(
      "auth",
      error
        ? `${error.name}${error.code ? ` (${error.code})` : ""}: ${error.message}`
        : "No user returned.",
    );
  }

  // Server-side domain check: only @iiml.ac.in accounts may stay signed in.
  if (!isAllowedEmail(data.user.email)) {
    await supabase.auth.signOut();
    // Remove the account Supabase just created so outsiders don't pile up in auth.users.
    await createAdminClient()
      .auth.admin.deleteUser(data.user.id)
      .catch(() => {});
    return NextResponse.redirect(`${origin}/login?error=domain`);
  }

  return NextResponse.redirect(`${origin}/`);
}

// Keep tokens and keys out of URLs and the page (an error message can quote
// the request header that failed).
function redact(text: string) {
  return text
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[redacted token]")
    .replace(/sb_(publishable|secret)_[\w-]+/g, "[redacted key]");
}
