/**
 * Resolves the project's "@/..." tsconfig path alias, and supplies the file
 * extension TypeScript imports omit, so Node's built-in test runner can load
 * project modules unchanged under --experimental-strip-types.
 *
 * Exists so the tests import exactly what the app imports — no build step, no
 * test-only copies of the modules under test, no extra dependency.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const ROOT = pathToFileURL(
  `${resolvePath(dirname(fileURLToPath(import.meta.url)), "..")}/`,
).href;

function withExtension(url) {
  if (/\.(ts|tsx|js|mjs|cjs|json)$/.test(url)) return url;
  for (const candidate of [`${url}.ts`, `${url}.tsx`, `${url}/index.ts`]) {
    if (existsSync(fileURLToPath(candidate))) return candidate;
  }
  return url;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(withExtension(new URL(specifier.slice(2), ROOT).href), context);
  }
  return nextResolve(specifier, context);
}
