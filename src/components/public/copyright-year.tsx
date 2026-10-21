"use client";

import { useIsClient } from "@/lib/use-is-client";

const BUILD_YEAR = 2026;

export function CopyrightYear() {
  const isClient = useIsClient();
  return <>{isClient ? new Date().getFullYear() : BUILD_YEAR}</>;
}
