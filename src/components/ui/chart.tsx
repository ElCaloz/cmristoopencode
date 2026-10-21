"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/use-is-client";
import { Skeleton } from "@/components/ui/skeleton";

export function ChartFrame({
  children,
  height = 280,
  className,
}: {
  children: ReactNode;
  height?: number;
  className?: string;
}) {
  const isClient = useIsClient();

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      {isClient ? children : <Skeleton className="h-full w-full" />}
    </div>
  );
}
