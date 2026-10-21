"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthError } from "@supabase/supabase-js";
import { safeNextPath } from "@/lib/auth/redirect";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/server/auth/types";

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Inserisci un indirizzo email valido."));

const nameField = z
  .string()
  .trim()
  .min(2, "Inserisci almeno 2 caratteri.")
  .max(80, "Il campo è troppo lungo.");

const passwordField = z
  .string()
  .min(8, "La password deve contenere almeno 8 caratteri.")
  .max(72, "La password non può superare 72 caratteri.");

const loginSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(6, "La password deve contenere almeno 6 caratteri.")
    .max(72, "La password non può superare 72 caratteri."),
});

const signupSchema = z.object({
  firstName: nameField,
  lastName: nameField,
  email: emailField,
  password: passwordField,
  terms: z.literal("on", {
    error: "Devi accettare i termini per continuare.",
  }),
});

const recoverySchema = z.object({
  email: emailField,
});

const resetSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Le password non coincidono.",
  });

const onboardingSchema = z.object({
  restaurantName: z
    .string()
    .trim()
    .min(2, "Inserisci il nome del locale.")
    .max(120, "Il nome del locale è troppo lungo."),
  city: z
    .string()
    .trim()
    .min(2, "Inserisci la città.")
    .max(100, "La città è troppo lunga."),
  venueType: z.enum(["restaurant", "trattoria", "pizzeria", "bar", "bistro", "other"], {
    error: "Seleziona un tipo di locale valido.",
  }),
  planId: z.enum(["starter", "pro", "business", "enterprise"], {
    error: "Seleziona un piano valido.",
  }),
});

function fieldErrors(error: z.ZodError): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = issue.message;
    }
  }

  return result;
}

function configurationError(): AuthActionState {
  return {
    status: "error",
    message:
      "Il servizio di autenticazione non è configurato in questo ambiente. Contatta l'amministratore.",
  };
}

function mapAuthError(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Email o password non corretti.";
    case "email_not_confirmed":
      return "Devi confermare la tua email prima di accedere. Controlla la posta.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Troppe richieste in poco tempo. Attendi qualche minuto e riprova.";
    case "weak_password":
      return "La password non rispetta i requisiti di sicurezza.";
    case "same_password":
      return "La nuova password deve essere diversa da quella attuale.";
    case "user_already_exists":
    case "email_exists":
      return "Questo indirizzo email è già registrato. Prova ad accedere o a recuperare la password.";
    case "signup_disabled":
      return "La registrazione è temporaneamente disabilitata.";
    default:
      if (!error.status) {
        return "Servizio di autenticazione non raggiungibile. Riprova tra poco.";
      }
      return "Operazione non riuscita. Riprova tra poco.";
  }
}

function slugify(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return normalized || "locale";
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  if (!isSupabaseConfigured()) return configurationError();

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { status: "error", message: mapAuthError(error) };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    terms: formData.get("terms"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  if (!isSupabaseConfigured()) return configurationError();

  const supabase = await createClient();
  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return { status: "error", message: mapAuthError(error) };
  }

  const alreadyRegistered = data.user?.identities?.length === 0;
  if (data.session) {
    redirect("/onboarding");
  }

  return {
    status: "success",
    message: alreadyRegistered
      ? "Se l'indirizzo non è già associato a un account, riceverai un'email di conferma. Se hai già un account, accedi o recupera la password."
      : "Account creato. Ti abbiamo inviato un'email di conferma: apri il link per completare la configurazione del locale.",
  };
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = recoverySchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  if (!isSupabaseConfigured()) return configurationError();

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reimposta-password`,
  });

  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return { status: "error", message: mapAuthError(error) };
  }

  return {
    status: "success",
    message:
      "Se l'indirizzo è associato a un account, riceverai un'email con il link per impostare una nuova password.",
  };
}

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  if (!isSupabaseConfigured()) return configurationError();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message:
        "La sessione di recupero è scaduta. Richiedi un nuovo link dalla pagina di recupero password.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: mapAuthError(error) };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login?status=logout");
}

export async function completeOnboardingAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = onboardingSchema.safeParse({
    restaurantName: formData.get("restaurantName"),
    city: formData.get("city"),
    venueType: formData.get("venueType"),
    planId: formData.get("planId"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  }

  if (!isSupabaseConfigured()) return configurationError();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?reason=session&next=/onboarding");
  }

  const slug = `${slugify(parsed.data.restaurantName)}-${crypto
    .randomUUID()
    .slice(0, 8)}`;

  const { data, error } = await supabase.rpc("complete_onboarding", {
    p_organization_name: parsed.data.restaurantName,
    p_restaurant_name: parsed.data.restaurantName,
    p_slug: slug,
    p_city: parsed.data.city,
    p_restaurant_kind: parsed.data.venueType,
    p_requested_plan: parsed.data.planId,
  });

  if (error) {
    if (error.code === "28000") {
      redirect("/login?reason=session&next=/onboarding");
    }
    if (error.code === "22023") {
      return {
        status: "error",
        message: "I dati inseriti non sono validi. Controlla i campi e riprova.",
      };
    }
    return {
      status: "error",
      message:
        "Non è stato possibile completare la configurazione. Riprova: se il problema persiste, contatta l'assistenza.",
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.new_organization_id) {
    return {
      status: "error",
      message: "Configurazione non completata. Riprova tra poco.",
    };
  }

  redirect("/dashboard");
}
