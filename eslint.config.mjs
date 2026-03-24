/**
 * ESLint configuration — Next.js recommended rules + TypeScript.
 *
 * Uses ESLint flat config format (ESLint 9+).
 * Extends Next.js core-web-vitals and TypeScript configs.
 */
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
