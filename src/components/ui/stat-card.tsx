import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: number | null;
  deltaLabel?: string;
  hint?: string;
  invertDelta?: boolean;
  className?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  hint,
  invertDelta = false,
  className,
}: StatCardProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const positive = hasDelta ? delta >= 0 : null;
  const good = hasDelta
    ? invertDelta
      ? !positive
      : positive
    : null;
  const DeltaIcon =
    !hasDelta || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-card border border-zinc-200/90 bg-white p-4 shadow-card transition-[border-color,box-shadow] duration-300 ease-smooth hover:border-zinc-300 hover:shadow-lift dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-zinc-500 transition-colors duration-300 group-hover:border-brand-200 group-hover:bg-brand-50 group-hover:text-brand-700 dark:border-zinc-700/80 dark:bg-zinc-800/80 dark:text-zinc-400 dark:group-hover:border-brand-800 dark:group-hover:bg-brand-950 dark:group-hover:text-brand-300">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-[1.65rem] font-semibold leading-none tracking-[-0.02em] text-zinc-900 tabular-nums dark:text-zinc-100">
        {value}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        {hasDelta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
              good
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400"
                : "bg-red-50 text-red-700 dark:bg-red-950/70 dark:text-red-400",
            )}
          >
            <DeltaIcon className="size-3.5" />
            {formatPercent(Math.abs(delta))}
          </span>
        ) : null}
        {deltaLabel || hint ? (
          <span className="text-zinc-500 dark:text-zinc-400">{deltaLabel ?? hint}</span>
        ) : null}
      </div>
    </div>
  );
}
