import type { Metadata } from "next";
import { DAILY_LIMIT, startOfTodayIST } from "@/lib/grievances";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { GrievanceForm } from "./grievance-form";

export const metadata: Metadata = {
  title: "File a grievance · samasaya",
};

export default async function NewGrievancePage() {
  const viewer = await requireViewer();

  if (viewer.role !== "student") {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
        Only students can file grievances.
      </p>
    );
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("grievance_board")
    .select("id", { count: "exact", head: true })
    .eq("is_mine", true)
    .gte("created_at", startOfTodayIST().toISOString());
  const remaining = Math.max(0, DAILY_LIMIT - (count ?? 0));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">File a grievance</h1>
      <p className="mt-1 text-sm text-zinc-500">
        It goes straight to the team responsible for the category you pick.
      </p>

      {remaining === 0 ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You&apos;ve filed {DAILY_LIMIT} grievances today, which is the daily
          limit. You can file more tomorrow.
        </p>
      ) : (
        <GrievanceForm remaining={remaining} />
      )}
    </div>
  );
}
