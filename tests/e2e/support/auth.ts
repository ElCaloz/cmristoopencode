import type { APIRequestContext } from "@playwright/test";

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:55004";

type MailpitRecipient = { Address?: string };

type MailpitMessageSummary = {
  ID: string;
  Subject?: string;
  To?: MailpitRecipient[];
};

type MailpitMessageList = { messages?: MailpitMessageSummary[] };

type MailpitMessageDetail = { HTML?: string; Text?: string };

export function uniqueEmail(prefix: string): string {
  const runId = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  return `${prefix}-${runId}@example.test`;
}

function extractLinks(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].flatMap((match) => {
    const href = match[1];
    return href ? [href.replace(/&amp;/g, "&")] : [];
  });
}

export async function waitForAuthEmailLink(
  request: APIRequestContext,
  email: string,
  kind: "signup" | "recovery",
  timeoutMs = 20_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const expectedType = kind === "recovery" ? "type=recovery" : "type=signup";

  while (Date.now() < deadline) {
    const listResponse = await request.get(`${MAILPIT_URL}/api/v1/messages`);

    if (listResponse.ok()) {
      const list = (await listResponse.json()) as MailpitMessageList;
      const message = (list.messages ?? []).find((entry) =>
        (entry.To ?? []).some(
          (recipient) => recipient.Address?.toLowerCase() === email.toLowerCase(),
        ),
      );

      if (message) {
        const detailResponse = await request.get(
          `${MAILPIT_URL}/api/v1/message/${message.ID}`,
        );

        if (detailResponse.ok()) {
          const detail = (await detailResponse.json()) as MailpitMessageDetail;
          const links = extractLinks(detail.HTML ?? detail.Text ?? "");
          const link =
            links.find((candidate) => candidate.includes(expectedType)) ??
            links.find((candidate) => candidate.includes("/auth/v1/verify")) ??
            links.find((candidate) => candidate.includes("/auth/callback"));

          if (link) {
            return link;
          }
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Email "${kind}" non ricevuta per ${email} entro ${timeoutMs} ms`,
  );
}
