"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TITLE_MAX,
  TITLE_MIN,
  isCategory,
} from "@/lib/grievances";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type SubmitState = {
  error?: string;
  fieldErrors?: Partial<Record<"category" | "title" | "description", string>>;
};

export async function submitGrievance(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const viewer = await requireViewer();
  if (viewer.role !== "student") {
    return { error: "Only students can file grievances." };
  }

  const category = formData.get("category");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isAnonymous = formData.get("is_anonymous") === "on";

  const fieldErrors: SubmitState["fieldErrors"] = {};
  if (!isCategory(category)) {
    fieldErrors.category = "Choose a category.";
  }
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    fieldErrors.title = `Title must be ${TITLE_MIN}–${TITLE_MAX} characters.`;
  }
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    fieldErrors.description = `Description must be ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} characters.`;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // The insert runs as the student, so RLS sets them as the author and the
  // database trigger enforces the daily limit.
  const supabase = await createClient();
  const { error } = await supabase.from("grievances").insert({
    category,
    title,
    description,
    is_anonymous: isAnonymous,
  });

  if (error) {
    if (error.hint === "daily_limit") {
      return { error: error.message };
    }
    console.error("submitGrievance failed", error);
    return { error: "Couldn't submit your grievance. Please try again." };
  }

  revalidatePath("/my");
  redirect("/my?submitted=1");
}
