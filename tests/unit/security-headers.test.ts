import { describe, expect, it } from "vitest";
import { buildSecurityHeaders, type SecurityHeader } from "@/lib/security/headers";

function toMap(headers: SecurityHeader[]) {
  return new Map(headers.map((header) => [header.key.toLowerCase(), header.value]));
}

describe("buildSecurityHeaders", () => {
  it("applica CSP e header di sicurezza in produzione", () => {
    const headers = toMap(
      buildSecurityHeaders({
        production: true,
        supabaseUrl: "https://abcdefgh.supabase.co",
      }),
    );

    const csp = headers.get("content-security-policy") ?? "";

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("https://abcdefgh.supabase.co");
    expect(csp).toContain("wss://abcdefgh.supabase.co");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("'unsafe-eval'");

    expect(headers.get("strict-transport-security")).toContain("max-age=");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("permissions-policy")).toContain("camera=()");
  });

  it("in sviluppo consente eval e websocket locali, senza HSTS", () => {
    const headers = toMap(buildSecurityHeaders({ production: false }));

    const csp = headers.get("content-security-policy") ?? "";

    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws://localhost:3000");
    expect(csp).not.toContain("upgrade-insecure-requests");
    expect(headers.has("strict-transport-security")).toBe(false);
  });

  it("non genera una CSP malformata con URL Supabase non valido", () => {
    const csp =
      toMap(buildSecurityHeaders({ production: true, supabaseUrl: "non-un-url" })).get(
        "content-security-policy",
      ) ?? "";

    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("non-un-url");
  });
});
