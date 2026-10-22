export type DeliveryResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string };

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export type IntegrationKind =
  | "email"
  | "sms"
  | "stripe"
  | "sentry"
  | "cloudflare"
  | "local_service";

export type IntegrationStatus = {
  kind: IntegrationKind;
  name: string;
  configured: boolean;
  detail: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(readEnv("RESEND_API_KEY"));
}

export function isSmsConfigured(): boolean {
  return Boolean(
    readEnv("TWILIO_ACCOUNT_SID") &&
      readEnv("TWILIO_AUTH_TOKEN") &&
      (readEnv("TWILIO_FROM_NUMBER") || readEnv("TWILIO_MESSAGING_SERVICE_SID")),
  );
}

export function isStripeConfigured(): boolean {
  return Boolean(readEnv("STRIPE_SECRET_KEY"));
}

export function isSentryConfigured(): boolean {
  return Boolean(readEnv("SENTRY_DSN") || readEnv("NEXT_PUBLIC_SENTRY_DSN"));
}

export function getPublicSiteUrl(): string {
  return (
    readEnv("NEXT_PUBLIC_SITE_URL") ??
    (readEnv("VERCEL_PROJECT_PRODUCTION_URL")
      ? `https://${readEnv("VERCEL_PROJECT_PRODUCTION_URL")}`
      : "http://localhost:3000")
  );
}

export function getEmailFrom(): string {
  return readEnv("RESEND_FROM") ?? "CM Risto <onboarding@resend.dev>";
}

export function getIntegrationStatuses(): IntegrationStatus[] {
  return [
    {
      kind: "email",
      name: "Resend · email transazionali",
      configured: isEmailConfigured(),
      detail: isEmailConfigured()
        ? `Mittente: ${getEmailFrom()}`
        : "Imposta RESEND_API_KEY per inviare email transazionali.",
    },
    {
      kind: "sms",
      name: "Twilio · SMS",
      configured: isSmsConfigured(),
      detail: isSmsConfigured()
        ? "Numero o Messaging Service configurato."
        : "Imposta TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e un mittente.",
    },
    {
      kind: "stripe",
      name: "Stripe · abbonamenti e pagamenti",
      configured: isStripeConfigured(),
      detail: isStripeConfigured()
        ? "Chiave server presente. Webhook firmati e idempotenti."
        : "Imposta STRIPE_SECRET_KEY e i prezzi dei piani per attivare il checkout.",
    },
    {
      kind: "sentry",
      name: "Sentry · error monitoring",
      configured: isSentryConfigured(),
      detail: isSentryConfigured()
        ? "Errori applicativi inviati a Sentry."
        : "Imposta SENTRY_DSN per raccogliere gli errori.",
    },
    {
      kind: "cloudflare",
      name: "Cloudflare · WAF",
      configured: Boolean(readEnv("CLOUDFLARE_ZONE_ID")),
      detail: readEnv("CLOUDFLARE_ZONE_ID")
        ? "Zona configurata per regole WAF."
        : "Nessun dominio/zona collegato: WAF non attivabile senza DNS.",
    },
    {
      kind: "local_service",
      name: "Servizio locale · stampa e sincronizzazione",
      configured: Boolean(readEnv("LOCAL_SERVICE_TOKEN")),
      detail: readEnv("LOCAL_SERVICE_TOKEN")
        ? "Token del servizio locale presente."
        : "Configura LOCAL_SERVICE_TOKEN per la coda di stampa.",
    },
  ];
}
