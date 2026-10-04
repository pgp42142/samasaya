import type { Status } from "@/lib/grievances";

const STYLES: Record<Status, string> = {
  Submitted: "bg-zinc-100 text-zinc-700",
  Acknowledged: "bg-sky-50 text-sky-700",
  "In progress": "bg-amber-50 text-amber-800",
  Resolved: "bg-emerald-50 text-emerald-700",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
