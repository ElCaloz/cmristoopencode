const DEFAULT_NEXT = "/dashboard";

const ALLOWED_PREFIXES = ["/dashboard", "/onboarding", "/reimposta-password"];

export function safeNextPath(
  value: unknown,
  fallback: string = DEFAULT_NEXT,
): string {
  if (typeof value !== "string") return fallback;

  const candidate = value.trim();
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  if (candidate.includes("\\") || /[\u0000-\u001f]/.test(candidate)) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(candidate, "http://cm-risto.local");
  } catch {
    return fallback;
  }

  if (parsed.origin !== "http://cm-risto.local") return fallback;

  const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
  );

  return allowed ? path : fallback;
}
