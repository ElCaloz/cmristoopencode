import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCallToken,
  getBearerToken,
  getInternalVoiceConfig,
  verifyBootstrapToken,
  verifyCallToken,
} from "@/server/receptionist/internal-auth";

const SECRET = "s".repeat(48);
const BOOTSTRAP = "b".repeat(48);

const claims = {
  callId: "3f0f5f52-9a12-4d43-b5a1-3f7e3b2f9a11",
  restaurantId: "f2f42e95-5b48-4ab5-9c3d-0d6c7f3b2a11",
  organizationId: "4a04d5fc-2a9e-4f2b-9a11-44f8b6f4c211",
  providerCallId: "livekit-call-001",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("configurazione API vocale interna", () => {
  it("richiede token e segreto con lunghezza minima", () => {
    vi.stubEnv("RECEPTIONIST_INTERNAL_TOKEN", "short");
    vi.stubEnv("RECEPTIONIST_INTERNAL_SECRET", SECRET);
    expect(getInternalVoiceConfig()).toBeNull();

    vi.stubEnv("RECEPTIONIST_INTERNAL_TOKEN", BOOTSTRAP);
    expect(getInternalVoiceConfig()).toEqual({
      bootstrapToken: BOOTSTRAP,
      secret: SECRET,
    });
  });
});

describe("token di chiamata", () => {
  it("crea e verifica un token valido", () => {
    const token = createCallToken(claims, SECRET, 300);
    expect(verifyCallToken(token, SECRET)).toMatchObject(claims);
  });

  it("rifiuta un token alterato o firmato con un altro segreto", () => {
    const token = createCallToken(claims, SECRET, 300);
    const [payload, signature] = token.split(".");

    expect(verifyCallToken(`${payload}.${signature}x`, SECRET)).toBeNull();
    expect(verifyCallToken(token, "x".repeat(48))).toBeNull();
    expect(verifyCallToken("non-un-token", SECRET)).toBeNull();
  });

  it("rifiuta un token scaduto", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T10:00:00Z"));
    const token = createCallToken(claims, SECRET, 60);

    vi.setSystemTime(new Date("2026-10-20T10:02:00Z"));
    expect(verifyCallToken(token, SECRET)).toBeNull();
  });

  it("estrae il bearer token solo con schema corretto", () => {
    const request = new Request("http://localhost/api/internal/voice/calls", {
      headers: { authorization: "Bearer abc.def" },
    });
    expect(getBearerToken(request)).toBe("abc.def");

    const invalid = new Request("http://localhost/api/internal/voice/calls", {
      headers: { authorization: "Basic abc" },
    });
    expect(getBearerToken(invalid)).toBeNull();
  });
});

describe("token bootstrap", () => {
  it("accetta solo il token atteso", () => {
    expect(verifyBootstrapToken(BOOTSTRAP, BOOTSTRAP)).toBe(true);
    expect(verifyBootstrapToken("altro", BOOTSTRAP)).toBe(false);
    expect(verifyBootstrapToken(null, BOOTSTRAP)).toBe(false);
  });
});
