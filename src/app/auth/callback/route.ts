import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
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
