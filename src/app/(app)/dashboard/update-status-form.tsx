"use client";

import { useActionState, useState } from "react";
import { STATUSES, type Status } from "@/lib/grievances";
import { updateStatus, type UpdateStatusState } from "./actions";

// Render with key={currentStatus} so the form resets after a successful update.
export function UpdateStatusForm({
  grievanceId,
  currentStatus,
}: {
  grievanceId: string;
  currentStatus: Status;
}) {
  const [state, formAction, pending] = useActionState<
    UpdateStatusState,
    FormData
  >(updateStatus, {});
  const nextIndex = Math.min(
    STATUSES.indexOf(currentStatus) + 1,
    STATUSES.length - 1,
  );
  const [status, setStatus] = useState<Status>(STATUSES[nextIndex]);
  const unchanged = status === currentStatus;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="grievance_id" value={grievanceId} />

      <fieldset>
        <legend className="text-xs font-medium text-zinc-700">New status</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUSES.map((s) => (
            <label key={s} className="cursor-pointer">
              <input
                type="radio"
                name="status"
                value={s}
                checked={status === s}
                onChange={() => setStatus(s)}
                className="peer sr-only"
              />
              <span className="flex min-h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-2 text-center text-sm text-zinc-700 transition peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400">
                {s}
                {s === currentStatus && (
                  <span className="sr-only"> (current)</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs font-medium text-zinc-700">
          Public comment{" "}
          <span className="font-normal text-zinc-500">
            (optional, shown to the student)
          </span>
        </span>
        <textarea
          name="comment"
          defaultValue={state.comment}
          maxLength={1000}
          rows={3}
          placeholder="What's been done or what happens next"
          className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none sm:text-sm"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || unchanged}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {pending
          ? "Saving…"
          : unchanged
            ? `Already ${currentStatus}`
            : `Mark as ${status}`}
      </button>
    </form>
  );
}
