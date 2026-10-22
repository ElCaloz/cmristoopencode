"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/lib/observability/client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, { boundary: "route" });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-start justify-center gap-4 px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        CM Risto
      </p>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Impossibile caricare questa sezione
      </h1>
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        L&apos;errore è stato registrato. Riprova oppure torna alla dashboard.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Riprova
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
