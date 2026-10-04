import { formatDate } from "@/lib/format";
import { STATUSES, type Status } from "@/lib/grievances";

export type StatusUpdate = {
  grievance_id: string;
  new_status: Status;
  comment: string | null;
  created_at: string;
};

// Submitted → Acknowledged → In progress → Resolved, with the date and
// resolver comment of the change that reached each step.
export function StatusTimeline({
  status,
  createdAt,
  updates,
}: {
  status: Status;
  createdAt: string;
  updates: StatusUpdate[];
}) {
  const currentIndex = STATUSES.indexOf(status);

  return (
    <ol className="space-y-0">
      {STATUSES.map((step, i) => {
        const reached = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const isLast = i === STATUSES.length - 1;
        // If a grievance moved back and forth, show the latest change.
        const update = updates.findLast((u) => u.new_status === step);
        const date = i === 0 ? createdAt : update?.created_at;

        return (
          <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute top-4 left-[7px] h-full w-0.5 ${
                  i < currentIndex ? "bg-zinc-900" : "bg-zinc-200"
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                reached
                  ? "border-zinc-900 bg-zinc-900"
                  : "border-zinc-300 bg-white"
              }`}
            >
              {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span
                  className={
                    reached ? "font-medium text-zinc-900" : "text-zinc-400"
                  }
                >
                  {step}
                </span>
                {reached && date && (
                  <time dateTime={date} className="text-xs text-zinc-500">
                    {formatDate(date)}
                  </time>
                )}
                {reached && !date && (
                  <span className="text-xs text-zinc-400">Skipped</span>
                )}
                <span className="sr-only">
                  {isCurrent ? "(current)" : reached ? "(done)" : "(pending)"}
                </span>
              </p>
              {reached && update?.comment && (
                <p className="mt-1 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                  {update.comment}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
