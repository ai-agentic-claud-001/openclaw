#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { channelTestRoots } from "../vitest.channel-paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const pnpm = "pnpm";

function normalizeRelative(inputPath) {
  return inputPath.split(path.sep).join("/");
}

function isTestFile(filePath) {
  return filePath.endsWith(".test.ts") || filePath.endsWith(".test.tsx");
}

function collectTestFiles(rootPath) {
  const results = [];
  const stack = [rootPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) {
      continue;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") {
          continue;
        }
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && isTestFile(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  return results.toSorted((left, right) => left.localeCompare(right));
}

function listChangedPaths(base, head = "HEAD") {
  if (!base) {
    throw new Error("A git base revision is required to list changed native plugins.");
  }

  return execFileSync("git", ["diff", "--name-only", base, head], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function hasNativePluginPackage(nativePluginId) {
  return fs.existsSync(path.join(repoRoot, "native-plugins", nativePluginId, "package.json"));
}

export function listAvailableNativePluginIds() {
  const nativePluginsDir = path.join(repoRoot, "native-plugins");
  if (!fs.existsSync(nativePluginsDir)) {
    return [];
  }

  return fs
    .readdirSync(nativePluginsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((nativePluginId) => hasNativePluginPackage(nativePluginId))
    .toSorted((left, right) => left.localeCompare(right));
}

export function detectChangedNativePluginIds(changedPaths) {
  const nativePluginIds = new Set();

  for (const rawPath of changedPaths) {
    const relativePath = normalizeRelative(String(rawPath).trim());
    if (!relativePath) {
      continue;
    }

    const nativePluginMatch = relativePath.match(/^native-plugins\/([^/]+)(?:\/|$)/);
    if (nativePluginMatch) {
      const nativePluginId = nativePluginMatch[1];
      if (hasNativePluginPackage(nativePluginId)) {
        nativePluginIds.add(nativePluginId);
      }
      continue;
    }

    const pairedCoreMatch = relativePath.match(/^src\/([^/]+)(?:\/|$)/);
    if (pairedCoreMatch && hasNativePluginPackage(pairedCoreMatch[1])) {
      nativePluginIds.add(pairedCoreMatch[1]);
    }
  }

  return [...nativePluginIds].toSorted((left, right) => left.localeCompare(right));
}

export function listChangedNativePluginIds(params = {}) {
  const base = params.base;
  const head = params.head ?? "HEAD";
  return detectChangedNativePluginIds(listChangedPaths(base, head));
}

function resolveNativePluginDirectory(targetArg, cwd = process.cwd()) {
  if (targetArg) {
    const asGiven = path.resolve(cwd, targetArg);
    if (fs.existsSync(path.join(asGiven, "package.json"))) {
      return asGiven;
    }

    const byName = path.join(repoRoot, "native-plugins", targetArg);
    if (fs.existsSync(path.join(byName, "package.json"))) {
      return byName;
    }

    throw new Error(
      `Unknown native plugin target "${targetArg}". Use a native plugin name like "slack" or a path under native-plugins/.`,
    );
  }

  let current = cwd;
  while (true) {
    if (
      normalizeRelative(path.relative(repoRoot, current)).startsWith("native-plugins/") &&
      fs.existsSync(path.join(current, "package.json"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw new Error(
    "No native plugin target provided, and current working directory is not inside native-plugins/.",
  );
}

export function resolveNativePluginTestPlan(params = {}) {
  const cwd = params.cwd ?? process.cwd();
  const targetArg = params.targetArg;
  const nativePluginDir = resolveNativePluginDirectory(targetArg, cwd);
  const nativePluginId = path.basename(nativePluginDir);
  const relativeNativePluginDir = normalizeRelative(path.relative(repoRoot, nativePluginDir));

  const roots = [relativeNativePluginDir];
  const pairedCoreRoot = path.join(repoRoot, "src", nativePluginId);
  if (fs.existsSync(pairedCoreRoot)) {
    const pairedRelativeRoot = normalizeRelative(path.relative(repoRoot, pairedCoreRoot));
    if (collectTestFiles(pairedCoreRoot).length > 0) {
      roots.push(pairedRelativeRoot);
    }
  }

  const usesChannelConfig = roots.some((root) => channelTestRoots.includes(root));
  const config = usesChannelConfig
    ? "vitest.channels.config.ts"
    : "vitest.native-plugins.config.ts";
  const testFiles = roots.flatMap((root) => collectTestFiles(path.join(repoRoot, root)));

  return {
    config,
    nativePluginDir: relativeNativePluginDir,
    nativePluginId,
    extensionDir: relativeNativePluginDir,
    extensionId: nativePluginId,
    roots,
    testFiles: testFiles.map((filePath) => normalizeRelative(path.relative(repoRoot, filePath))),
  };
}

export const listAvailableExtensionIds = listAvailableNativePluginIds;
export const detectChangedExtensionIds = detectChangedNativePluginIds;
export const listChangedExtensionIds = listChangedNativePluginIds;
export const resolveExtensionTestPlan = resolveNativePluginTestPlan;

function printUsage() {
  console.error("Usage: pnpm test:native-plugin <native-plugin-name|path> [vitest args...]");
  console.error(
    "       node scripts/test-native-plugin.mjs [native-plugin-name|path] [vitest args...]",
  );
  console.error("       node scripts/test-native-plugin.mjs --list");
  console.error(
    "       node scripts/test-native-plugin.mjs --list-changed --base <git-ref> [--head <git-ref>]",
  );
  console.error("       node scripts/test-native-plugin.mjs <native-plugin> --require-tests");
}

function printNoTestsMessage(plan, requireTests) {
  const message = `No tests found for ${plan.nativePluginDir}. Run "pnpm test:native-plugin ${plan.nativePluginId} -- --dry-run" to inspect the resolved roots.`;
  if (requireTests) {
    console.error(message);
    return 1;
  }
  console.log(`[test-native-plugin] ${message} Skipping.`);
  return 0;
}

export async function main(argv = process.argv.slice(2)) {
  const rawArgs = argv;
  const dryRun = rawArgs.includes("--dry-run");
  const requireTests =
    rawArgs.includes("--require-tests") ||
    process.env.OPENCLAW_TEST_NATIVE_PLUGIN_REQUIRE_TESTS === "1" ||
    process.env.OPENCLAW_TEST_EXTENSION_REQUIRE_TESTS === "1";
  const json = rawArgs.includes("--json");
  const list = rawArgs.includes("--list");
  const listChanged = rawArgs.includes("--list-changed");
  const args = rawArgs.filter(
    (arg) =>
      arg !== "--" &&
      arg !== "--dry-run" &&
      arg !== "--require-tests" &&
      arg !== "--json" &&
      arg !== "--list" &&
      arg !== "--list-changed",
  );

  let base = "";
  let head = "HEAD";
  const passthroughArgs = [];

  if (listChanged) {
    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];
      if (arg === "--base") {
        base = args[index + 1] ?? "";
        index += 1;
        continue;
      }
      if (arg === "--head") {
        head = args[index + 1] ?? "HEAD";
        index += 1;
        continue;
      }
      passthroughArgs.push(arg);
    }
  } else {
    passthroughArgs.push(...args);
  }

  if (list) {
    const nativePluginIds = listAvailableNativePluginIds();
    if (json) {
      process.stdout.write(
        `${JSON.stringify({ nativePluginIds, extensionIds: nativePluginIds }, null, 2)}\n`,
      );
    } else {
      for (const nativePluginId of nativePluginIds) {
        console.log(nativePluginId);
      }
    }
    return;
  }

  if (listChanged) {
    let nativePluginIds;
    try {
      nativePluginIds = listChangedNativePluginIds({ base, head });
    } catch (error) {
      printUsage();
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    if (json) {
      process.stdout.write(
        `${JSON.stringify({ base, head, nativePluginIds, extensionIds: nativePluginIds }, null, 2)}\n`,
      );
    } else {
      for (const nativePluginId of nativePluginIds) {
        console.log(nativePluginId);
      }
    }
    return;
  }

  let targetArg;
  if (passthroughArgs[0] && !passthroughArgs[0].startsWith("-")) {
    targetArg = passthroughArgs.shift();
  }

  let plan;
  try {
    plan = resolveNativePluginTestPlan({ cwd: process.cwd(), targetArg });
  } catch (error) {
    printUsage();
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (dryRun) {
    if (json) {
      process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    } else {
      console.log(`[test-native-plugin] ${plan.nativePluginId}`);
      console.log(`config: ${plan.config}`);
      console.log(`roots: ${plan.roots.join(", ")}`);
      console.log(`tests: ${plan.testFiles.length}`);
    }
    return;
  }

  if (plan.testFiles.length === 0) {
    process.exit(printNoTestsMessage(plan, requireTests));
  }

  console.log(
    `[test-native-plugin] Running ${plan.testFiles.length} test files for ${plan.nativePluginId} with ${plan.config}`,
  );

  const child = spawn(
    pnpm,
    ["exec", "vitest", "run", "--config", plan.config, ...plan.testFiles, ...passthroughArgs],
    {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    },
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";

if (import.meta.url === entryHref) {
  await main();
}
