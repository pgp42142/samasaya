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
  // Effective role and department: for an admin using "View as", the view
  // they chose. The database applies the same rule, so this only drives the UI.
  role: Role;
  department: Category | null;
  // The role stored on the account, ignoring "View as".
  realRole: Role;
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
    .select("name, role, department, view_as_role, view_as_department")
    .eq("id", user.id)
    .maybeSingle();

  const realRole = (profile?.role as Role | undefined) ?? "student";
  const viewingAs = realRole === "admin" && profile?.view_as_role != null;

  return {
    id: user.id,
    email: user.email!,
    name:
      profile?.name ??
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email!,
    role: viewingAs ? (profile!.view_as_role as Role) : realRole,
    department:
      ((viewingAs ? profile!.view_as_department : profile?.department) as
        | Category
        | null) ?? null,
    realRole,
  };
});
