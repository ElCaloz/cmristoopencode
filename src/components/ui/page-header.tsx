import type * as React from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  eyebrow?: string;
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  badge,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-balance text-[1.4rem] font-semibold leading-tight tracking-[-0.02em] text-zinc-900 dark:text-zinc-100 sm:text-[1.65rem]">
            {title}
          </h1>
          {badge}
        </div>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
