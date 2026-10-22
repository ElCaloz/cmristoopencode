import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("secret scanner", () => {
  it("supera il selftest dei pattern", () => {
    const output = execFileSync(
      process.execPath,
      ["scripts/scan-secrets.mjs", "--selftest"],
      { encoding: "utf8" },
    );

    expect(output).toContain("Selftest superato");
    expect(output).toContain("auto-esclusione dello scanner");
  });
});
