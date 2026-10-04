import type { Metadata } from "next";
import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { isCategory, isStatus, type BoardGrievance } from "@/lib/grievances";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { UpvoteButton, UpvoteCount } from "@/components/upvote-button";
import { BoardFilters, type BoardSort } from "./board-filters";

export const metadata: Metadata = {
  title: "Board · samasaya",
};

const PAGE_SIZE = 100;

export default async function BoardPage({ searchParams }: PageProps<"/">) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const category = isCategory(params.category) ? params.category : null;
  const status = isStatus(params.status) ? params.status : null;
  const sort: BoardSort = params.sort === "newest" ? "newest" : "top";

  const supabase = await createClient();
  let query = supabase.from("grievance_board").select("*");
  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);
  if (sort === "top") query = query.order("upvote_count", { ascending: false });
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  const grievances = (data ?? []) as BoardGrievance[];

  const filtered = category !== null || status !== null;
  const now = new Date();

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Board</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {viewer.role === "resolver"
              ? `Grievances for ${viewer.department}.`
              : "What students across campus are raising."}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <BoardFilters category={category} status={status} sort={sort} />
      </div>

      {error ? (
        <p className="mt-6 text-sm text-red-700">
          Couldn&apos;t load the board. Please refresh the page.
        </p>
      ) : grievances.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          {filtered ? (
            <>
              No grievances match these filters.{" "}
              <Link href="/" className="font-medium text-zinc-900 underline">
                Clear filters
              </Link>
            </>
          ) : (
            "No grievances yet."
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {grievances.map((g) => (
            <li
              key={g.id}
              className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                  <span className="font-medium text-zinc-700">{g.category}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={g.created_at}>{timeAgo(g.created_at, now)}</time>
                </p>
                <h2 className="mt-1 font-medium text-zinc-900">{g.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                  {g.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <StatusBadge status={g.status} />
                  <span>
                    {/* The board never shows who filed an anonymous grievance,
                        even to admins. */}
                    {g.is_anonymous ? "Anonymous" : g.author_name}
                    {g.is_mine && " (you)"}
                  </span>
                </div>
              </div>
              {viewer.role === "student" && !g.is_mine ? (
                <UpvoteButton
                  grievanceId={g.id}
                  initialUpvoted={g.has_upvoted}
                  initialCount={g.upvote_count}
                />
              ) : (
                <UpvoteCount count={g.upvote_count} />
              )}
            </li>
          ))}
        </ul>
      )}

      {grievances.length === PAGE_SIZE && (
        <p className="mt-4 text-center text-xs text-zinc-500">
          Showing the first {PAGE_SIZE}. Use the filters to narrow it down.
        </p>
      )}
    </div>
  );
}
