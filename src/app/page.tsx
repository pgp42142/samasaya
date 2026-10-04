import { redirect } from "next/navigation";
import { isAllowedEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function HomePage() {
  const supabase = await createClient();
  // getUser() verifies the session with Supabase, so this check can't be
  // bypassed by a forged cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    redirect("/login");
  }

  const name =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold tracking-tight text-zinc-900">
            samasaya
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Welcome, {name}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">{user.email}</p>
        <p className="mt-8 rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
          Grievance features are coming soon.
        </p>
      </main>
    </div>
  );
}
