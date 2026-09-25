import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PLATFORM_SRC = "/Users/mohankumarv/Desktop/Projects/Clients/AXTECH/Savewatt/savewatt-platform/src/";

// Resolve the platform's "@/..." aliases and extensionless relative imports
// between .ts files when running under bare node.
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const target = PLATFORM_SRC + specifier.slice(2);
    return next(pathToFileURL(existsSync(target) ? target : `${target}.ts`).href);
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.endsWith(".ts") &&
    !/\.[a-z0-9]+$/.test(specifier)
  ) {
    const resolved = new URL(specifier, context.parentURL);
    if (!existsSync(resolved)) {
      return next(new URL(`${specifier}.ts`, context.parentURL).href);
    }
  }
  return next(specifier, context);
}
