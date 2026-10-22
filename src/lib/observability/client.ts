export function reportClientError(
  error: { message?: string; stack?: string; digest?: string },
  context: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;

  const payload = {
    message: error.message ?? "Errore client",
    stack: error.stack,
    url: window.location.href,
    context: {
      ...context,
      digest: error.digest,
      userAgent: navigator.userAgent,
    },
  };

  void fetch("/api/observability", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // L'osservabilità non deve interrompere l'esperienza utente.
  });
}
