"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CATEGORIES } from "@/lib/grievances";

export type DashboardSort = "top" | "newest" | "oldest";

export function DashboardControls({
  showCategory,
  category,
  sort,
  status,
}: {
  showCategory: boolean;
  category: string | null;
  sort: DashboardSort;
  status: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(key: "category" | "sort", value: string) {
    const next = { category, sort, status, [key]: value || null };
    const params = new URLSearchParams();
    if (next.category) params.set("category", next.category);
    if (next.status) params.set("status", next.status);
    if (next.sort && next.sort !== "top") params.set("sort", next.sort);
    const qs = params.toString();
    startTransition(() =>
      router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false }),
    );
  }

  const selectClass =
    "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none sm:py-2 sm:text-sm";

  return (
    <div
      className={`grid gap-2 ${showCategory ? "grid-cols-2" : "grid-cols-1 sm:max-w-xs"} ${pending ? "opacity-60" : ""}`}
    >
      {showCategory && (
        <label>
          <span className="sr-only">Category</span>
          <select
            value={category ?? ""}
            onChange={(e) => update("category", e.target.value)}
            className={selectClass}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span className="sr-only">Sort</span>
        <select
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
          className={selectClass}
        >
          <option value="top">Most upvoted</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </label>
    </div>
  );
}
