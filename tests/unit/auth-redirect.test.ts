import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it("usa il fallback per valori assenti o non stringa", () => {
    expect(safeNextPath(undefined)).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(42)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
  });

  it("accetta solo path interni consentiti", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/dashboard?tab=ordini")).toBe("/dashboard?tab=ordini");
    expect(safeNextPath("/onboarding")).toBe("/onboarding");
    expect(safeNextPath("/reimposta-password?code=abc#top")).toBe(
      "/reimposta-password?code=abc#top",
    );
  });

  it("rifiuta URL esterni e path non previsti", () => {
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(safeNextPath("/dashboard\\evil")).toBe("/dashboard");
    expect(safeNextPath("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNextPath("/login")).toBe("/dashboard");
    expect(safeNextPath("/dashboard-evil")).toBe("/dashboard");
    expect(safeNextPath("/app/panoramica")).toBe("/dashboard");
  });

  it("rispetta un fallback personalizzato", () => {
    expect(safeNextPath("https://evil.example", "/onboarding")).toBe(
      "/onboarding",
    );
  });
});
