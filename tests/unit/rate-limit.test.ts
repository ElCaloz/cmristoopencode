import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/security/rate-limit";

const BASE_TIME = 1_000_000;

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("consente fino al limite e poi blocca", () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(checkRateLimit("test", 3, 1_000, BASE_TIME).allowed).toBe(true);
    }

    const blocked = checkRateLimit("test", 3, 1_000, BASE_TIME);

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("riapre la finestra dopo la scadenza", () => {
    checkRateLimit("test", 1, 1_000, BASE_TIME);
    expect(checkRateLimit("test", 1, 1_000, BASE_TIME).allowed).toBe(false);
    expect(checkRateLimit("test", 1, 1_000, BASE_TIME + 1_001).allowed).toBe(true);
  });

  it("mantiene bucket separati per chiave", () => {
    checkRateLimit("a", 1, 1_000, BASE_TIME);
    expect(checkRateLimit("a", 1, 1_000, BASE_TIME).allowed).toBe(false);
    expect(checkRateLimit("b", 1, 1_000, BASE_TIME).allowed).toBe(true);
  });

  it("rifiuta parametri non validi", () => {
    expect(() => checkRateLimit("test", 0, 1_000, BASE_TIME)).toThrow();
    expect(() => checkRateLimit("test", 1, 0, BASE_TIME)).toThrow();
  });
});
