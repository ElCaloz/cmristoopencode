import { expect, test } from "@playwright/test";

test("header di sicurezza globali e protezione delle aree riservate", async ({
  request,
}) => {
  const page = await request.get("/login");
  expect(page.status()).toBe(200);

  const headers = page.headers();
  const csp = headers["content-security-policy"] ?? "";

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("form-action 'self'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-powered-by"]).toBeUndefined();

  const dashboard = await request.get("/dashboard", { maxRedirects: 0 });
  expect([307, 308]).toContain(dashboard.status());
  expect(dashboard.headers()["location"]).toContain("/login");

  const voiceApi = await request.post("/api/internal/voice/calls", {
    data: {},
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  expect([401, 503]).toContain(voiceApi.status());
  expect(voiceApi.status()).not.toBe(200);
});
