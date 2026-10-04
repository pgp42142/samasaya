"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isCategory } from "@/lib/grievances";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// value: "admin", "student" or "resolver:<category>"
export async function setViewAs(value: string): Promise<{ error?: string }> {
  const viewer = await requireViewer();
  if (viewer.realRole !== "admin") {
    return { error: "Only admins can switch views." };
  }

  const separator = value.indexOf(":");
  const role = separator === -1 ? value : value.slice(0, separator);
  const department = separator === -1 ? null : value.slice(separator + 1);
  if (role !== "admin" && role !== "student" && role !== "resolver") {
    return { error: "Unknown view." };
  }
  if (role === "resolver" && !isCategory(department)) {
    return { error: "Choose a department." };
  }

  // The database checks the real role again and applies the view to every
  // policy, so this can't be used to escalate.
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_view_as", {
    p_role: role,
    p_department: role === "resolver" ? department : null,
  });
  if (error) {
    console.error("setViewAs failed", error);
    return { error: "Couldn't switch view. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect(role === "student" ? "/" : "/dashboard");
}
