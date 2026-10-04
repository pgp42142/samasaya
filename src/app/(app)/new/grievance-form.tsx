"use client";

import { useActionState, useEffect, useState } from "react";
import {
  CATEGORIES,
  DAILY_LIMIT,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TITLE_MAX,
  TITLE_MIN,
  type BoardGrievance,
  type Category,
} from "@/lib/grievances";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import { submitGrievance, type SubmitState } from "./actions";

export function GrievanceForm({ remaining }: { remaining: number }) {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitGrievance,
    {},
  );
  const [category, setCategory] = useState<Category | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const similar = useSimilarGrievances(category, title);

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <fieldset>
        <legend className="text-sm font-medium text-zinc-900">Category</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name="category"
                value={c}
                checked={category === c}
                onChange={() => setCategory(c)}
                required
                className="peer sr-only"
              />
              <span className="flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-center text-sm text-zinc-700 transition peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400 hover:border-zinc-400">
                {c}
              </span>
            </label>
          ))}
        </div>
        <FieldError message={state.fieldErrors?.category} />
      </fieldset>

      <div>
        <label htmlFor="title" className="text-sm font-medium text-zinc-900">
          Title
        </label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={TITLE_MIN}
          maxLength={TITLE_MAX}
          autoComplete="off"
          placeholder="e.g. No hot water in Hostel 4 after 8 AM"
          className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none sm:text-sm"
        />
        <div className="mt-1 flex justify-between gap-2">
          <FieldError message={state.fieldErrors?.title} />
          <Counter value={title.length} max={TITLE_MAX} />
        </div>

        {similar.length > 0 && <SimilarList grievances={similar} />}
      </div>

      <div>
        <label
          htmlFor="description"
          className="text-sm font-medium text-zinc-900"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={DESCRIPTION_MIN}
          maxLength={DESCRIPTION_MAX}
          rows={6}
          placeholder="What happened, where, and since when?"
          className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none sm:text-sm"
        />
        <div className="mt-1 flex justify-between gap-2">
          <FieldError message={state.fieldErrors?.description} />
          <Counter value={description.length} max={DESCRIPTION_MAX} />
        </div>
      </div>

      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4">
        <span>
          <span className="block text-sm font-medium text-zinc-900">
            Submit anonymously
          </span>
          <span className="mt-0.5 block text-sm text-zinc-500">
            Resolvers won&apos;t see your name, but the system keeps it to
            prevent abuse.
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          name="is_anonymous"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-zinc-300 transition peer-checked:bg-zinc-900 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit grievance"}
        </button>
        <p className="mt-2 text-center text-xs text-zinc-500">
          {remaining} of {DAILY_LIMIT} submissions left today
        </p>
      </div>
    </form>
  );
}

function useSimilarGrievances(category: Category | null, title: string) {
  const [results, setResults] = useState<BoardGrievance[]>([]);
  const query = title.trim();
  const active = category !== null && query.length >= 4;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await createClient().rpc("similar_grievances", {
        p_category: category,
        p_title: query,
      });
      if (!cancelled) setResults((data as BoardGrievance[] | null) ?? []);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, category, query]);

  return active ? results : [];
}

function SimilarList({ grievances }: { grievances: BoardGrievance[] }) {
  return (
    <section
      aria-live="polite"
      className="mt-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3"
    >
      <h2 className="text-sm font-medium text-sky-900">
        Similar open grievances
      </h2>
      <p className="text-xs text-sky-800">
        If one of these is your issue, upvote it instead of filing a new one.
      </p>
      <ul className="mt-3 space-y-2">
        {grievances.map((g) => (
          <SimilarItem key={g.id} grievance={g} />
        ))}
      </ul>
    </section>
  );
}

function SimilarItem({ grievance }: { grievance: BoardGrievance }) {
  const [upvoted, setUpvoted] = useState(grievance.has_upvoted);
  const [count, setCount] = useState(grievance.upvote_count);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    const { error } = upvoted
      ? await supabase.from("upvotes").delete().eq("grievance_id", grievance.id)
      : await supabase.from("upvotes").insert({ grievance_id: grievance.id });
    if (!error) {
      setUpvoted(!upvoted);
      setCount((n) => n + (upvoted ? -1 : 1));
    }
    setBusy(false);
  }

  return (
    <li className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900">{grievance.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <StatusBadge status={grievance.status} />
          <span>
            {count} upvote{count === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      {grievance.is_mine ? (
        <span className="shrink-0 py-1.5 text-xs text-zinc-500">Filed by you</span>
      ) : (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-pressed={upvoted}
          className={`flex min-h-9 shrink-0 items-center gap-1 rounded-lg border px-3 text-sm font-medium transition disabled:opacity-60 ${
            upvoted
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
          }`}
        >
          <span aria-hidden="true">▲</span>
          {upvoted ? "Upvoted" : "Upvote"}
        </button>
      )}
    </li>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return <span />;
  return <p className="text-xs text-red-600">{message}</p>;
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span
      className={`shrink-0 text-xs tabular-nums ${value > max * 0.9 ? "text-amber-700" : "text-zinc-400"}`}
    >
      {value}/{max}
    </span>
  );
}
