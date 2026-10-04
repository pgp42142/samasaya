import Link from "next/link";
import { requireViewer } from "@/lib/session";
import { signOut } from "../actions";
import { NavLinks } from "./nav-links";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await requireViewer();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 pt-3 sm:py-3">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-zinc-900"
          >
            samasaya
          </Link>
          <div className="hidden flex-1 sm:block">
            <NavLinks role={viewer.role} />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="max-w-40 truncate text-sm text-zinc-500"
              title={viewer.email}
            >
              {viewer.name}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 sm:hidden">
          <NavLinks role={viewer.role} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-16">
        {children}
      </main>
    </div>
  );
}
