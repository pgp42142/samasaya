import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDate, timeAgo } from "@/lib/format";
import {
  STATUSES,
  isCategory,
  isStatus,
  type BoardGrievance,
  type Status,
} from "@/lib/grievances";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { DashboardControls, type DashboardSort } from "./dashboard-controls";
import { UpdateStatusForm } from "./update-status-form";

export const metadata: Metadata = {
  title: "Dashboard · samasaya",
};

const PAGE_SIZE = 100;
const OVERDUE_DAYS = 3;

type LogEntry = {
  grievance_id: string;
  old_status: Status;
  new_status: Status;
  comment: string | null;
  created_at: string;
  updated_by_name: string | null;
};

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const viewer = await requireViewer();
  if (viewer.role !== "resolver" && viewer.role !== "admin") {
    redirect("/");
  }
  const isAdmin = viewer.role === "admin";

  const params = await searchParams;
  // Resolvers are limited to their department by the database; only admins
  // get a category filter.
  const category = isAdmin && isCategory(params.category) ? params.category : null;
  const status = isStatus(params.status) ? params.status : null;
  const sort: DashboardSort =
    params.sort === "newest" || params.sort === "oldest" ? params.sort : "top";

  const supabase = await createClient();
  const now = new Date();
  const overdueBefore = new Date(now.getTime() - OVERDUE_DAYS * 86_400_000);
  const isOverdue = (g: Pick<BoardGrievance, "status" | "created_at">) =>
    g.status === "Submitted" && new Date(g.created_at) < overdueBefore;

  // Counts for the whole scope (ignoring the status filter).
  let countQuery = supabase.from("grievance_board").select("status, created_at");
  if (category) countQuery = countQuery.eq("category", category);
  const { data: countRows } = await countQuery;
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    Status,
    number
  >;
  let overdueCount = 0;
  for (const row of (countRows ?? []) as Pick<
    BoardGrievance,
    "status" | "created_at"
  >[]) {
    counts[row.status]++;
    if (isOverdue(row)) overdueCount++;
  }
  const total = countRows?.length ?? 0;

  let listQuery = supabase.from("grievance_board").select("*");
  if (category) listQuery = listQuery.eq("category", category);
  if (status) listQuery = listQuery.eq("status", status);
  if (sort === "top") {
    listQuery = listQuery
      .order("upvote_count", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    listQuery = listQuery.order("created_at", { ascending: sort === "oldest" });
  }
  const { data, error } = await listQuery.limit(PAGE_SIZE);
  const grievances = (data ?? []) as BoardGrievance[];

  const logByGrievance = new Map<string, LogEntry[]>();
  if (grievances.length > 0) {
    const { data: log } = await supabase
      .from("status_update_log")
      .select("grievance_id, old_status, new_status, comment, created_at, updated_by_name")
      .in(
        "grievance_id",
        grievances.map((g) => g.id),
      )
      .order("created_at", { ascending: false });
    for (const entry of (log ?? []) as LogEntry[]) {
      const list = logByGrievance.get(entry.grievance_id) ?? [];
      list.push(entry);
      logByGrievance.set(entry.grievance_id, list);
    }
  }

  const href = (next: { status?: Status | null }) => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    const s = next.status === undefined ? status : next.status;
    if (s) qs.set("status", s);
    if (sort !== "top") qs.set("sort", sort);
    const str = qs.toString();
    return str ? `/dashboard?${str}` : "/dashboard";
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {isAdmin
          ? "All departments."
          : `Grievances for ${viewer.department}.`}{" "}
        Status changes and comments are visible to students.
      </p>

      <nav aria-label="Filter by status" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUSES.map((s) => {
          const active = status === s;
          return (
            <Link
              key={s}
              href={href({ status: active ? null : s })}
              aria-current={active ? "true" : undefined}
              scroll={false}
              className={`rounded-xl border p-3 transition ${
                active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
              }`}
            >
              <span className="block text-2xl font-semibold tabular-nums">
                {counts[s]}
              </span>
              <span
                className={`block text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}
              >
                {s}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-zinc-500">
          {status ? (
            <>
              Showing {status.toLowerCase()} ·{" "}
              <Link href={href({ status: null })} scroll={false} className="font-medium text-zinc-900 underline">
                Show all {total}
              </Link>
            </>
          ) : (
            `${total} total`
          )}
        </p>
        {overdueCount > 0 && (
          <p className="font-medium text-red-700">
            {overdueCount} overdue (Submitted over {OVERDUE_DAYS} days)
          </p>
        )}
      </div>

      <div className="mt-4">
        <DashboardControls
          showCategory={isAdmin}
          category={category}
          sort={sort}
          status={status}
        />
      </div>

      {error ? (
        <p className="mt-6 text-sm text-red-700">
          Couldn&apos;t load grievances. Please refresh the page.
        </p>
      ) : grievances.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          No grievances here.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {grievances.map((g) => {
            const overdue = isOverdue(g);
            const log = logByGrievance.get(g.id) ?? [];
            return (
              <li
                key={g.id}
                className={`rounded-xl border bg-white p-4 ${
                  overdue ? "border-red-300 ring-1 ring-red-200" : "border-zinc-200"
                }`}
              >
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                  <span className="font-medium text-zinc-700">{g.category}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={g.created_at} title={formatDate(g.created_at)}>
                    {timeAgo(g.created_at, now)}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    ▲ {g.upvote_count}
                    <span className="sr-only"> upvotes</span>
                  </span>
                  {overdue && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                      Overdue
                    </span>
                  )}
                </p>
                <div className="mt-1 flex items-start justify-between gap-3">
                  <h2 className="font-medium text-zinc-900">{g.title}</h2>
                  <StatusBadge status={g.status} />
                </div>
                <p className="mt-1 text-sm whitespace-pre-line text-zinc-600">
                  {g.description}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {/* Never show who filed an anonymous grievance, even to admins. */}
                  {g.is_anonymous ? "Anonymous" : `Filed by ${g.author_name}`}
                </p>

                <details className="group mt-3 border-t border-zinc-100 pt-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-zinc-900 select-none">
                    <span className="inline-block transition group-open:rotate-90">›</span>{" "}
                    Update status
                  </summary>
                  <div className="mt-3">
                    <UpdateStatusForm
                      key={g.status}
                      grievanceId={g.id}
                      currentStatus={g.status}
                    />
                  </div>
                </details>

                {log.length > 0 && (
                  <details className="group mt-2">
                    <summary className="cursor-pointer list-none text-sm text-zinc-600 select-none">
                      <span className="inline-block transition group-open:rotate-90">›</span>{" "}
                      History ({log.length})
                    </summary>
                    <ol className="mt-2 space-y-2">
                      {log.map((entry, i) => (
                        <li key={i} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                          <p className="text-xs text-zinc-500">
                            {formatDate(entry.created_at)} ·{" "}
                            {entry.updated_by_name ?? "Former staff"}
                          </p>
                          <p className="text-zinc-800">
                            {entry.old_status} → {entry.new_status}
                          </p>
                          {entry.comment && (
                            <p className="mt-0.5 text-zinc-600">{entry.comment}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {grievances.length === PAGE_SIZE && (
        <p className="mt-4 text-center text-xs text-zinc-500">
          Showing the first {PAGE_SIZE}. Filter by status or category to see more.
        </p>
      )}
    </div>
  );
}
