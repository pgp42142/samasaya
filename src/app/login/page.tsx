import type { Metadata } from "next";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth";
import { GoogleSignInButton } from "./google-button";

export const metadata: Metadata = {
  title: "Sign in · samasaya",
};

const ERRORS: Record<string, string> = {
  domain: `Only @${ALLOWED_EMAIL_DOMAIN} accounts can sign in. Please use your IIM Lucknow email.`,
  auth: "Sign-in didn't complete. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          samasaya
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Grievance portal for IIM Lucknow students
        </p>

        {message && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {message}
          </p>
        )}

        <div className="mt-6">
          <GoogleSignInButton />
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Use your @{ALLOWED_EMAIL_DOMAIN} Google account.
        </p>
      </div>
    </main>
  );
}
