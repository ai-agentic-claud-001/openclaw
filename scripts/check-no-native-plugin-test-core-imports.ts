import fs from "node:fs";
import path from "node:path";

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; hint: string }> = [
  {
    pattern: /["']openclaw\/plugin-sdk["']/,
    hint: "Use openclaw/plugin-sdk/<subpath> instead of the monolithic root entry.",
  },
  {
    pattern: /["']openclaw\/plugin-sdk\/test-utils["']/,
    hint: "Use openclaw/plugin-sdk/testing for the public native plugin test surface.",
  },
  {
    pattern: /["']openclaw\/plugin-sdk\/compat["']/,
    hint: "Use a focused public plugin-sdk subpath instead of compat.",
  },
  {
    pattern: /["'](?:\.\.\/)+(?:test-utils\/)[^"']+["']/,
    hint: "Use test/helpers/native-plugins/* for repo-only bundled native plugin test helpers.",
  },
  {
    pattern: /["'](?:\.\.\/)+(?:src\/test-utils\/)[^"']+["']/,
    hint: "Use test/helpers/native-plugins/* for repo-only helpers, or openclaw/plugin-sdk/testing for public surfaces.",
  },
  {
    pattern: /["'](?:\.\.\/)+(?:src\/plugins\/types\.js)["']/,
    hint: "Use public plugin-sdk/core types or test/helpers/native-plugins/* instead.",
  },
];

function isNativePluginTestFile(filePath: string): boolean {
  return /\.test\.[cm]?[jt]sx?$/u.test(filePath) || /\.e2e\.test\.[cm]?[jt]sx?$/u.test(filePath);
}

function collectNativePluginTestFiles(rootDir: string): string[] {
  const files: string[] = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "coverage") {
          continue;
        }
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && isNativePluginTestFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function main() {
  const nativePluginsDir = path.join(process.cwd(), "native-plugins");
  const files = collectNativePluginTestFiles(nativePluginsDir);
  const offenders: Array<{ file: string; hint: string }> = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const rule of FORBIDDEN_PATTERNS) {
      if (!rule.pattern.test(content)) {
        continue;
      }
      offenders.push({ file, hint: rule.hint });
      break;
    }
  }

  if (offenders.length > 0) {
    console.error(
      "Native plugin test files must stay on native plugin test bridges or public plugin-sdk surfaces.",
    );
    for (const offender of offenders.toSorted((a, b) => a.file.localeCompare(b.file))) {
      const relative = path.relative(process.cwd(), offender.file) || offender.file;
      console.error(`- ${relative}: ${offender.hint}`);
    }
    process.exit(1);
  }

  console.log(
    `OK: native plugin test files avoid direct core test/internal imports (${files.length} checked).`,
  );
}

main();
