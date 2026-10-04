import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isAllowedEmail } from "@/lib/auth";
import type { Category, Role } from "@/lib/grievances";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: Category | null;
};

// The signed-in user and their profile, or a redirect to /login.
// Cached so a layout and page in the same request share one lookup.
export const requireViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  // getUser() verifies the session with Supabase, so a forged cookie fails.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, role, department")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email!,
    name:
      profile?.name ??
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email!,
    role: (profile?.role as Role | undefined) ?? "student",
    department: (profile?.department as Category | null) ?? null,
  };
});
