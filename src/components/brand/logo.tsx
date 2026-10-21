import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  inverted = false,
  withTagline = false,
}: {
  className?: string;
  inverted?: boolean;
  withTagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
        <UtensilsCrossed className="size-4.5" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[15px] font-semibold tracking-tight",
            inverted ? "text-white" : "text-zinc-900 dark:text-zinc-50",
          )}
        >
          CM Risto
        </span>
        {withTagline ? (
          <span
            className={cn(
              "mt-1 text-[10px] font-medium uppercase tracking-[0.14em]",
              inverted ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400",
            )}
          >
            Restaurant Suite
          </span>
        ) : null}
      </span>
    </span>
  );
}
