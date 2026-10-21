import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthLayout } from "@/components/public/auth-layout";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Imposta nuova password",
  description: "Imposta una nuova password per il tuo account CM Risto.",
};

async function ResetGate() {
  if (!isSupabaseConfigured()) {
    redirect("/recupera-password?reason=config");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/recupera-password?reason=session");
  }

  return <ResetPasswordForm email={user.email ?? null} />;
}

function ResetFallback() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-14 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-10 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Imposta una nuova password"
      description="Scegli una password diversa da quella precedente. Al termine verrai portato alla dashboard reale."
      footer={
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          <Link
            href="/recupera-password"
            className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            <ArrowLeft className="size-3" />
            Richiedi un nuovo link
          </Link>
        </p>
      }
    >
      <Suspense fallback={<ResetFallback />}>
        <ResetGate />
      </Suspense>
    </AuthLayout>
  );
}
