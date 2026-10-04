import Link from "next/link";
import { requireViewer } from "@/lib/session";

export default async function HomePage() {
  const viewer = await requireViewer();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        Welcome, {viewer.name}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">{viewer.email}</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {viewer.role === "student" && (
          <Link
            href="/new"
            className="rounded-xl bg-zinc-900 p-5 text-white transition hover:bg-zinc-800"
          >
            <span className="block font-medium">File a grievance</span>
            <span className="mt-1 block text-sm text-zinc-300">
              Raise an issue with the right team.
            </span>
          </Link>
        )}
        <Link
          href="/my"
          className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300"
        >
          <span className="block font-medium text-zinc-900">My grievances</span>
          <span className="mt-1 block text-sm text-zinc-500">
            Track the status of what you&apos;ve filed.
          </span>
        </Link>
      </div>
    </div>
  );
}
