#!/usr/bin/env node
/**
 * Scansione dei file tracciati da git alla ricerca di segreti accidentali.
 * Non stampa mai il valore trovato: solo percorso, riga e tipo di pattern.
 *
 * Uso:
 *   node scripts/scan-secrets.mjs
 *   node scripts/scan-secrets.mjs --selftest
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MAX_FILE_BYTES = 512 * 1024;

const PATTERNS = [
  {
    name: "private-key",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  },
  {
    name: "github-token",
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/g,
  },
  {
    name: "github-fine-grained",
    regex: /\bgithub_pat_[A-Za-z0-9_]{30,}\b/g,
  },
  {
    name: "stripe-live-key",
    regex: /\bsk_live_[A-Za-z0-9]{20,}\b/g,
  },
  {
    name: "resend-api-key",
    regex: /\bre_[A-Za-z0-9_]{24,}\b/g,
  },
  {
    name: "aws-access-key",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    name: "google-api-key",
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    name: "slack-token",
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    name: "jwt",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
];

const ALLOWLIST = [
  /sostituisci/i,
  /placeholder/i,
  /redacted/i,
  /\bexample\b/i,
  /<[^>]+>/,
  /\{[a-z_]+:[a-z_]+\}/i,
];

const IGNORED_PATHS = [
  /^package-lock\.json$/,
  /(^|\/)node_modules\//,
  /(^|\/)\.next\//,
  /(^|\/)test-results\//,
  /(^|\/)playwright-report\//,
  /(^|\/)\.git\//,
  /\.(png|jpe?g|gif|webp|ico|pdf|zip|woff2?|ttf|mp4|mp3)$/i,
];

function isIgnoredPath(file) {
  return IGNORED_PATHS.some((pattern) => pattern.test(file));
}

export function scanText(text, file = "input") {
  const findings = [];

  text.split(/\r?\n/).forEach((line, index) => {
    if (ALLOWLIST.some((allowed) => allowed.test(line))) return;

    for (const { name, regex } of PATTERNS) {
      regex.lastIndex = 0;
      if (regex.test(line)) {
        findings.push({ file, line: index + 1, pattern: name });
      }
    }
  });

  return findings;
}

function trackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: process.cwd(),
    maxBuffer: 64 * 1024 * 1024,
  });

  return output
    .toString("utf8")
    .split("\u0000")
    .filter(Boolean)
    .filter((file) => !isIgnoredPath(file));
}

function scanRepository() {
  const files = trackedFiles();
  const findings = [];
  let scanned = 0;

  for (const file of files) {
    const fullPath = join(process.cwd(), file);
    let info;
    try {
      info = statSync(fullPath);
    } catch {
      continue;
    }

    if (!info.isFile() || info.size > MAX_FILE_BYTES) continue;

    const buffer = readFileSync(fullPath);
    if (buffer.subarray(0, 8192).includes(0)) continue;

    scanned += 1;
    findings.push(...scanText(buffer.toString("utf8"), file));
  }

  return { scanned, findings };
}

function selftest() {
  const cases = [
    {
      label: "github token",
      text: `const token = "ghp_${"a".repeat(36)}";`,
      expected: 1,
    },
    {
      label: "private key",
      text: "-----BEGIN RSA PRIVATE KEY-----",
      expected: 1,
    },
    {
      label: "stripe live",
      text: `sk_live_${"x".repeat(24)}`,
      expected: 1,
    },
    {
      label: "placeholder consentito",
      text: 'GITHUB_PAT="sostituisci-con-un-token"',
      expected: 0,
    },
    {
      label: "codice normale",
      text: "const value = process.env.GITHUB_PAT;",
      expected: 0,
    },
  ];

  let failures = 0;
  for (const testCase of cases) {
    const found = scanText(testCase.text, "fixture").length;
    const ok = found === testCase.expected;
    if (!ok) failures += 1;
    console.log(`${ok ? "ok" : "FAIL"} - ${testCase.label} (attesi ${testCase.expected}, trovati ${found})`);
  }

  if (failures > 0) {
    console.error(`Selftest fallito: ${failures} caso/i.`);
    process.exit(1);
  }

  console.log(`Selftest superato: ${cases.length}/${cases.length}.`);
}

if (process.argv.includes("--selftest")) {
  selftest();
  process.exit(0);
}

let result;
try {
  result = scanRepository();
} catch (error) {
  console.error(`Scansione non eseguibile: ${error instanceof Error ? error.message : "errore sconosciuto"}`);
  process.exit(2);
}

console.log(`Secret scan - file analizzati: ${result.scanned}`);

for (const finding of result.findings) {
  console.error(`[FINDING] ${finding.file}:${finding.line} - ${finding.pattern}`);
}

if (result.findings.length > 0) {
  console.error(`Risultato: ${result.findings.length} potenziale/i segreto/i trovato/i.`);
  process.exit(1);
}

console.log("Risultato: nessun segreto rilevato nei file tracciati.");
