import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveOpenClawPackageRootSync } from "../infra/openclaw-root.js";
import { resolveUserPath } from "../utils.js";

function isSourceCheckoutRoot(packageRoot: string): boolean {
  return (
    fs.existsSync(path.join(packageRoot, ".git")) &&
    fs.existsSync(path.join(packageRoot, "src")) &&
    (fs.existsSync(path.join(packageRoot, "native-plugins")) ||
      fs.existsSync(path.join(packageRoot, "extensions")))
  );
}

export function resolveBundledPluginsDir(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const override = env.OPENCLAW_BUNDLED_PLUGINS_DIR?.trim();
  if (override) {
    return resolveUserPath(override, env);
  }

  const preferSourceCheckout = Boolean(env.VITEST);

  try {
    const packageRoots = [
      resolveOpenClawPackageRootSync({ cwd: process.cwd() }),
      resolveOpenClawPackageRootSync({ moduleUrl: import.meta.url }),
    ].filter(
      (entry, index, all): entry is string => Boolean(entry) && all.indexOf(entry) === index,
    );
    for (const packageRoot of packageRoots) {
      const sourceNativePluginsDir = path.join(packageRoot, "native-plugins");
      const legacySourceExtensionsDir = path.join(packageRoot, "extensions");
      const builtNativePluginsDir = path.join(packageRoot, "dist", "native-plugins");
      const legacyBuiltExtensionsDir = path.join(packageRoot, "dist", "extensions");
      if (
        (preferSourceCheckout || isSourceCheckoutRoot(packageRoot)) &&
        fs.existsSync(sourceNativePluginsDir)
      ) {
        return sourceNativePluginsDir;
      }
      if (
        (preferSourceCheckout || isSourceCheckoutRoot(packageRoot)) &&
        fs.existsSync(legacySourceExtensionsDir)
      ) {
        return legacySourceExtensionsDir;
      }
      // Local source checkouts stage a runtime-complete bundled plugin tree under
      // dist-runtime/. Prefer that over source native plugins only when the paired
      // dist/ tree exists; otherwise wrappers can drift ahead of the last build.
      const runtimeNativePluginsDir = path.join(packageRoot, "dist-runtime", "native-plugins");
      const legacyRuntimeExtensionsDir = path.join(packageRoot, "dist-runtime", "extensions");
      if (fs.existsSync(runtimeNativePluginsDir) && fs.existsSync(builtNativePluginsDir)) {
        return runtimeNativePluginsDir;
      }
      if (fs.existsSync(legacyRuntimeExtensionsDir) && fs.existsSync(legacyBuiltExtensionsDir)) {
        return legacyRuntimeExtensionsDir;
      }
      if (fs.existsSync(builtNativePluginsDir)) {
        return builtNativePluginsDir;
      }
      if (fs.existsSync(legacyBuiltExtensionsDir)) {
        return legacyBuiltExtensionsDir;
      }
    }
  } catch {
    // ignore
  }

  // bun --compile: ship a sibling `native-plugins/` next to the executable.
  try {
    const execDir = path.dirname(process.execPath);
    const siblingBuilt = path.join(execDir, "dist", "native-plugins");
    if (fs.existsSync(siblingBuilt)) {
      return siblingBuilt;
    }
    const legacySiblingBuilt = path.join(execDir, "dist", "extensions");
    if (fs.existsSync(legacySiblingBuilt)) {
      return legacySiblingBuilt;
    }
    const sibling = path.join(execDir, "native-plugins");
    if (fs.existsSync(sibling)) {
      return sibling;
    }
    const legacySibling = path.join(execDir, "extensions");
    if (fs.existsSync(legacySibling)) {
      return legacySibling;
    }
  } catch {
    // ignore
  }

  // npm/dev: walk up from this module to find `native-plugins/` at the package root.
  try {
    let cursor = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 6; i += 1) {
      const candidate = path.join(cursor, "native-plugins");
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      const legacyCandidate = path.join(cursor, "extensions");
      if (fs.existsSync(legacyCandidate)) {
        return legacyCandidate;
      }
      const parent = path.dirname(cursor);
      if (parent === cursor) {
        break;
      }
      cursor = parent;
    }
  } catch {
    // ignore
  }

  return undefined;
}
