import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-300",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        outline:
          "border-zinc-300 bg-transparent text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
        warning:
          "border-transparent bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
        danger:
          "border-transparent bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
        info: "border-transparent bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
        muted:
          "border-transparent bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
        dark: "border-zinc-700 bg-zinc-800 text-zinc-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    dot?: boolean;
  };

export function Badge({
  className,
  variant,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? (
        <span className="size-1.5 rounded-full bg-current opacity-80" />
      ) : null}
      {children}
    </span>
  );
}
