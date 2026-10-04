"use server";

import { revalidatePath } from "next/cache";
import { isStatus } from "@/lib/grievances";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

// On error, the comment is sent back so the form can keep what was typed.
export type UpdateStatusState = { error?: string; comment?: string; ok?: boolean };

const COMMENT_MAX = 1000;

export async function updateStatus(
  _prev: UpdateStatusState,
  formData: FormData,
): Promise<UpdateStatusState> {
  const viewer = await requireViewer();
  if (viewer.role !== "resolver" && viewer.role !== "admin") {
    return { error: "Only resolvers and admins can change a status." };
  }

  const grievanceId = String(formData.get("grievance_id") ?? "");
  const status = formData.get("status");
  const comment = String(formData.get("comment") ?? "").trim();

  if (!isStatus(status)) {
    return { error: "Choose a status.", comment };
  }
  if (comment.length > COMMENT_MAX) {
    return { error: `Keep the comment under ${COMMENT_MAX} characters.`, comment };
  }

  // The database function checks the department, updates the grievance and
  // records the change (with who and when) in status_updates.
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_grievance_status", {
    p_grievance_id: grievanceId,
    p_new_status: status,
    p_comment: comment || null,
  });

  if (error) {
    if (error.code === "22023" || error.code === "42501") {
      return { error: error.message, comment };
    }
    console.error("updateStatus failed", error);
    return { error: "Couldn't update the status. Please try again.", comment };
  }

  revalidatePath("/dashboard");
  revalidatePath("/my");
  revalidatePath("/");
  return { ok: true };
}
