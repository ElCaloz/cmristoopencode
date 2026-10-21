import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div
      className="min-h-screen bg-zinc-50 dark:bg-zinc-950"
      role="status"
      aria-label="Caricamento dashboard"
      aria-busy="true"
    >
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Skeleton className="h-7 w-44" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-card border border-zinc-200 bg-white p-5 shadow-card dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-4 h-6 w-48" />
              <Skeleton className="mt-2 h-3 w-64 max-w-full" />
              <Skeleton className="mt-4 h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Caricamento in corso</span>
    </div>
  );
}
