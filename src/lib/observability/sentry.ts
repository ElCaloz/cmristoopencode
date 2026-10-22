type SentryDsn = {
  endpoint: string;
  publicKey: string;
};

type StackFrame = {
  filename?: string;
  function?: string;
  lineno?: number;
  colno?: number;
};

function parseDsn(value: string): SentryDsn | null {
  try {
    const url = new URL(value);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return null;
    return {
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      publicKey: url.username,
    };
  } catch {
    return null;
  }
}

function parseStack(stack: string | undefined): StackFrame[] {
  if (!stack) return [];
  const frames: StackFrame[] = [];
  for (const line of stack.split("\n").slice(1, 30)) {
    const match = line.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/) ??
      line.match(/at\s+(.*?):(\d+):(\d+)/);
    if (!match) continue;
    if (match.length === 5) {
      frames.push({
        function: match[1],
        filename: match[2],
        lineno: Number(match[3]),
        colno: Number(match[4]),
      });
    } else {
      frames.push({
        filename: match[1],
        lineno: Number(match[2]),
        colno: Number(match[3]),
      });
    }
  }
  return frames;
}

function getDsn(): SentryDsn | null {
  const value =
    process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return value ? parseDsn(value) : null;
}

export async function captureException(
  error: unknown,
  context: Record<string, unknown> = {},
): Promise<void> {
  const dsn = getDsn();
  if (!dsn) return;

  const normalized =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Errore sconosciuto");

  const eventId = globalThis.crypto?.randomUUID?.().replaceAll("-", "") ??
    `${Date.now()}${Math.random().toString(16).slice(2)}`;

  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: "error",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    server_name: "cm-risto",
    exception: {
      values: [
        {
          type: normalized.name,
          value: normalized.message.slice(0, 1000),
          stacktrace: { frames: parseStack(normalized.stack) },
        },
      ],
    },
    extra: context,
    tags: {
      runtime: process.env.NEXT_RUNTIME ?? "nodejs",
    },
  };

  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
    "",
  ].join("\n");

  try {
    await fetch(dsn.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-sentry-envelope",
        "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=cm-risto/1.0`,
      },
      body: envelope,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // L'osservabilità non deve mai bloccare la richiesta principale.
  }
}

export async function captureMessage(
  message: string,
  context: Record<string, unknown> = {},
): Promise<void> {
  await captureException(new Error(message), context);
}
