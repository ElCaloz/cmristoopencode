import type { Page } from "@playwright/test";

// Rumore dev-only della instrumentation React/Next (vercel/next.js#86060):
// non esiste nel build di produzione, vedi D-019 in docs/DECISIONS.md.
const IGNORED_DEV_ERRORS: RegExp[] = [/cannot have a negative time stamp/];

export function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    if (IGNORED_DEV_ERRORS.some((pattern) => pattern.test(error.message))) {
      return;
    }
    errors.push(error.message);
  });
  return errors;
}
