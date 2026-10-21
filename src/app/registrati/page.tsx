import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthLayout } from "@/components/public/auth-layout";

export const metadata: Metadata = {
  title: "Registrati",
  description: "Crea un account CM Risto e configura il tuo ristorante.",
};

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Crea il tuo account"
      description="Registrati per configurare il locale. Dopo la conferma dell'email potrai scegliere il piano senza inserire dati di pagamento."
      footer={
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          Hai già un account?{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
            Accedi
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
