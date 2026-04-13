#!/usr/bin/env node
/**
 * run-ts.mjs — Lightweight TypeScript runner using the project's own typescript dependency.
 *
 * WHY THIS EXISTS:
 * `npx tsx` often fails on mixed-architecture setups (Rosetta 2 vs native arm64)
 * because esbuild ships platform-specific binaries. This script uses the already-
 * installed `typescript` package (a devDependency of every Next.js project) to
 * transpile and immediately execute a .ts file. No extra binary dependencies.
 *
 * USAGE:
 *   node scripts/run-ts.mjs scripts/generate-seo-pages.ts [args...]
 *
 * The extra [args...] are forwarded to the transpiled script via process.argv.
 */

import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { createRequire } from "module";
import { tmpdir } from "os";
import { join } from "path";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const tsFile = process.argv[2];
if (!tsFile) {
  console.error("Usage: node scripts/run-ts.mjs <file.ts> [args...]");
  process.exit(1);
}

const source = readFileSync(tsFile, "utf-8");
const result = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2017,
    esModuleInterop: true,
  },
});

const tmpFile = join(tmpdir(), `_run_ts_${Date.now()}.cjs`);
writeFileSync(tmpFile, result.outputText, "utf-8");

const extraArgs = process.argv.slice(3).map((a) => `"${a}"`).join(" ");

try {
  execSync(`node "${tmpFile}" ${extraArgs}`, { stdio: "inherit", cwd: process.cwd() });
} finally {
  try { unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
}
