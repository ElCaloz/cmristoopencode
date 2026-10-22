"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/observability/client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, { boundary: "global" });
  }, [error]);

  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fafafa",
          color: "#18181b",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: 520 }}>
          <p
            style={{
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#71717a",
              marginBottom: 12,
            }}
          >
            CM Risto
          </p>
          <h1 style={{ fontSize: 28, lineHeight: 1.2, margin: "0 0 12px" }}>
            Qualcosa è andato storto
          </h1>
          <p style={{ color: "#52525b", lineHeight: 1.6, margin: "0 0 24px" }}>
            L&apos;errore è stato registrato. Puoi riprovare; se il problema
            continua, ricarica la pagina o contatta l&apos;assistenza.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: 0,
              borderRadius: 10,
              background: "#18181b",
              color: "#fff",
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Riprova
          </button>
        </main>
      </body>
    </html>
  );
}
