"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CATEGORIES, STATUSES } from "@/lib/grievances";

export type BoardSort = "top" | "newest";

export function BoardFilters({
  category,
  status,
  sort,
}: {
  category: string | null;
  status: string | null;
  sort: BoardSort;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(key: "category" | "status" | "sort", value: string) {
    const params = new URLSearchParams();
    const next = { category, status, sort, [key]: value || null };
    if (next.category) params.set("category", next.category);
    if (next.status) params.set("status", next.status);
    if (next.sort && next.sort !== "top") params.set("sort", next.sort);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `/?${qs}` : "/", { scroll: false }));
  }

  return (
    <div
      className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${pending ? "opacity-60" : ""}`}
    >
      <Select
        label="Category"
        value={category ?? ""}
        onChange={(v) => update("category", v)}
        options={[["", "All categories"], ...CATEGORIES.map((c) => [c, c] as const)]}
      />
      <Select
        label="Status"
        value={status ?? ""}
        onChange={(v) => update("status", v)}
        options={[["", "All statuses"], ...STATUSES.map((s) => [s, s] as const)]}
      />
      <Select
        label="Sort"
        value={sort}
        onChange={(v) => update("sort", v)}
        options={[
          ["top", "Most upvoted"],
          ["newest", "Newest"],
        ]}
        className="col-span-2 sm:col-span-1"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none sm:py-2 sm:text-sm"
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
