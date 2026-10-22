export type SecurityHeader = {
  key: string;
  value: string;
};

type SecurityHeaderOptions = {
  production: boolean;
  supabaseUrl?: string | null;
};

function connectSources(supabaseUrl?: string | null): string[] {
  const sources = new Set(["'self'"]);

  if (supabaseUrl) {
    try {
      const origin = new URL(supabaseUrl).origin;
      sources.add(origin);
      sources.add(origin.replace(/^http/, "ws"));
    } catch {
      // URL non valido: il client Supabase fallirà con un errore esplicito,
      // qui evitiamo solo di generare una CSP malformata.
    }
  }

  return [...sources];
}

/**
 * Header di sicurezza applicati a tutte le risposte.
 *
 * La CSP mantiene `'unsafe-inline'` per script e stili perché Next.js inietta
 * bootstrap e stili inline; blocca comunque origini esterne, frame e plugin.
 * In sviluppo serve anche `'unsafe-eval'` per il refresh di React.
 */
export function buildSecurityHeaders({
  production,
  supabaseUrl,
}: SecurityHeaderOptions): SecurityHeader[] {
  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (!production) scriptSources.push("'unsafe-eval'");

  const connect = connectSources(supabaseUrl);
  if (!production) {
    connect.push("ws://localhost:3000", "ws://127.0.0.1:3000");
  }

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const headers: SecurityHeader[] = [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ];

  if (production) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
