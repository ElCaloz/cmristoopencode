import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "local-service/dist/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
    // Scratch di verifica visiva (gia escluso da git in .gitignore):
    ".taste-skill/**",
  ]),
]);

export default eslintConfig;
