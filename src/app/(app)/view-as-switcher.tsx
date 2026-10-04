"use client";

import { useState, useTransition } from "react";
import { CATEGORIES, type Category, type Role } from "@/lib/grievances";
import { setViewAs } from "../actions";

// Shown only to real admins (the layout checks, and so do the server action
// and the database).
export function ViewAsSwitcher({
  role,
  department,
}: {
  role: Role;
  department: Category | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const current = role === "resolver" ? `resolver:${department}` : role;
  const viewingAs = role !== "admin";

  return (
    <div
      className={`text-xs ${viewingAs ? "bg-amber-100 text-amber-950" : "bg-zinc-900 text-zinc-100"}`}
    >
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5">
        <label className="flex items-center gap-2">
          <span className="font-medium">View as</span>
          <select
            value={current}
            disabled={pending}
            onChange={(e) => {
              const value = e.target.value;
              setError(null);
              startTransition(async () => {
                const result = await setViewAs(value);
                if (result?.error) setError(result.error);
              });
            }}
            className={`rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-60 ${
              viewingAs
                ? "border-amber-300 bg-white text-amber-950"
                : "border-zinc-700 bg-zinc-800 text-white"
            }`}
          >
            <option value="admin">Admin</option>
            <option value="student">Student</option>
            <optgroup label="Resolver">
              {CATEGORIES.map((c) => (
                <option key={c} value={`resolver:${c}`}>
                  Resolver · {c}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {pending && <span>Switching…</span>}
        {!pending && viewingAs && (
          <span>You&apos;re seeing exactly what this role sees.</span>
        )}
        {error && <span role="alert">{error}</span>}
      </div>
    </div>
  );
}
