import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PublicMenu } from "@/components/public/public-menu";
import { getPublicMenuData } from "@/server/online/queries";

export const metadata: Metadata = {
  title: "Menu digitale",
  description: "Menu digitale e ordini online del ristorante.",
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;

async function PublicMenuContent({ params }: { params: Params }) {
  const { token } = await params;
  const data = await getPublicMenuData(token);

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Link non disponibile
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Questo link al menu non è valido, è scaduto o è stato disattivato dal
          ristorante. Chiedi al personale un nuovo QR code.
        </p>
        <Link
          href="/"
          className="mt-5 text-sm font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-400"
        >
          Torna a CM Risto
        </Link>
      </div>
    );
  }

  return <PublicMenu data={data} token={token} />;
}

function PublicMenuSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <div className="h-7 w-56 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
          <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-6 sm:px-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    </div>
  );
}

export default function PublicMenuPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<PublicMenuSkeleton />}>
      <PublicMenuContent params={params} />
    </Suspense>
  );
}
