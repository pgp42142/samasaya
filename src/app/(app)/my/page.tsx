import type { Metadata } from "next";
import Link from "next/link";
import type { BoardGrievance } from "@/lib/grievances";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = {
  title: "My grievances · samasaya",
};

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export default async function MyGrievancesPage({
  searchParams,
}: PageProps<"/my">) {
  const viewer = await requireViewer();
  const { submitted } = await searchParams;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grievance_board")
    .select("*")
    .eq("is_mine", true)
    .order("created_at", { ascending: false });
  const grievances = (data ?? []) as BoardGrievance[];

  return (
    <div>
      {submitted === "1" && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <p className="text-sm font-medium text-emerald-900">
            Grievance submitted
          </p>
          <p className="mt-0.5 text-sm text-emerald-800">
            It&apos;s been sent to the responsible team. You can follow its
            status here.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">My grievances</h1>
        {viewer.role === "student" && (
          <Link
            href="/new"
            className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            File new
          </Link>
        )}
      </div>

      {error ? (
        <p className="mt-6 text-sm text-red-700">
          Couldn&apos;t load your grievances. Please refresh the page.
        </p>
      ) : grievances.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          You haven&apos;t filed any grievances yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {grievances.map((g, i) => (
            <li
              key={g.id}
              className={`rounded-xl border bg-white p-4 ${
                submitted === "1" && i === 0
                  ? "border-emerald-300 ring-1 ring-emerald-200"
                  : "border-zinc-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-medium text-zinc-900">{g.title}</h2>
                <StatusBadge status={g.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                {g.description}
              </p>
              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span>{g.category}</span>
                <span>{dateFormat.format(new Date(g.created_at))}</span>
                <span>
                  {g.upvote_count} upvote{g.upvote_count === 1 ? "" : "s"}
                </span>
                {g.is_anonymous && <span>Anonymous</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
