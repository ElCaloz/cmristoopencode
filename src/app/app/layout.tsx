import type { Metadata } from "next";
import type * as React from "react";
import { AppShell } from "@/components/app/app-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function GestionaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
