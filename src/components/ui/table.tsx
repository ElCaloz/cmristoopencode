import type * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    // `relative` fa da containing block agli elementi assoluti delle celle
    // (es. gli sr-only dell'accessibilita): altrimenti sfuggono al clip di
    // overflow-x-auto e allargano il documento (D-056).
    <div className="relative w-full overflow-x-auto">
      <table
        className={cn("w-full caption-bottom border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("bg-zinc-50/80 dark:bg-zinc-900/60", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y divide-zinc-100 dark:divide-zinc-800", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-zinc-50/70 data-[state=selected]:bg-zinc-50 dark:hover:bg-zinc-800/50 dark:data-[state=selected]:bg-zinc-800",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "h-10 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("px-4 py-3 align-middle text-zinc-700 dark:text-zinc-300", className)}
      {...props}
    />
  );
}
