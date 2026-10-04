"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Toggles the viewer's upvote. The database allows one upvote per person per
// grievance, and RLS makes the upvote the viewer's own.
export function UpvoteButton({
  grievanceId,
  initialUpvoted,
  initialCount,
}: {
  grievanceId: string;
  initialUpvoted: boolean;
  initialCount: number;
}) {
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    const { error } = upvoted
      ? await supabase.from("upvotes").delete().eq("grievance_id", grievanceId)
      : await supabase.from("upvotes").insert({ grievance_id: grievanceId });
    // 23505: already upvoted (e.g. from another tab), so treat it as done.
    if (!error || error.code === "23505") {
      setUpvoted(!upvoted);
      setCount((n) => n + (upvoted ? -1 : 1));
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={upvoted}
      aria-label={`${upvoted ? "Remove upvote" : "Upvote"} (${count} upvote${count === 1 ? "" : "s"})`}
      className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium tabular-nums transition disabled:opacity-60 ${
        upvoted
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
      }`}
    >
      <span aria-hidden="true">▲</span>
      {count}
    </button>
  );
}

// Read-only count, for grievances the viewer can't upvote (e.g. their own).
export function UpvoteCount({ count }: { count: number }) {
  return (
    <span
      className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm text-zinc-500 tabular-nums"
      aria-label={`${count} upvote${count === 1 ? "" : "s"}`}
    >
      <span aria-hidden="true">▲</span>
      {count}
    </span>
  );
}
