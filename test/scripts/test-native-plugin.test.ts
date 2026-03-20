import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  detectChangedNativePluginIds,
  listAvailableNativePluginIds,
  resolveNativePluginTestPlan,
} from "../../scripts/test-native-plugin.mjs";

const scriptPath = path.join(process.cwd(), "scripts", "test-native-plugin.mjs");

function readPlan(args: string[], cwd = process.cwd()) {
  const stdout = execFileSync(process.execPath, [scriptPath, ...args, "--dry-run", "--json"], {
    cwd,
    encoding: "utf8",
  });
  return JSON.parse(stdout) as ReturnType<typeof resolveNativePluginTestPlan>;
}

function runScript(args: string[], cwd = process.cwd()) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

describe("scripts/test-native-plugin.mjs", () => {
  it("resolves channel-root native plugins onto the channel vitest config", () => {
    const plan = resolveNativePluginTestPlan({ targetArg: "slack", cwd: process.cwd() });

    expect(plan.nativePluginId).toBe("slack");
    expect(plan.nativePluginDir).toBe("native-plugins/slack");
    expect(plan.config).toBe("vitest.channels.config.ts");
    expect(plan.testFiles.some((file) => file.startsWith("native-plugins/slack/"))).toBe(true);
  });

  it("resolves provider native plugins onto the native-plugin vitest config", () => {
    const plan = resolveNativePluginTestPlan({ targetArg: "firecrawl", cwd: process.cwd() });

    expect(plan.nativePluginId).toBe("firecrawl");
    expect(plan.config).toBe("vitest.native-plugins.config.ts");
    expect(plan.testFiles.some((file) => file.startsWith("native-plugins/firecrawl/"))).toBe(true);
  });

  it("includes paired src roots when they contain tests", () => {
    const plan = resolveNativePluginTestPlan({ targetArg: "line", cwd: process.cwd() });

    expect(plan.roots).toContain("native-plugins/line");
    expect(plan.roots).toContain("src/line");
    expect(plan.config).toBe("vitest.channels.config.ts");
    expect(plan.testFiles.some((file) => file.startsWith("src/line/"))).toBe(true);
  });

  it("infers the native plugin from the current working directory", () => {
    const cwd = path.join(process.cwd(), "native-plugins", "slack");
    const plan = readPlan([], cwd);

    expect(plan.nativePluginId).toBe("slack");
    expect(plan.nativePluginDir).toBe("native-plugins/slack");
  });

  it("maps changed paths back to native plugin ids", () => {
    const nativePluginIds = detectChangedNativePluginIds([
      "native-plugins/slack/src/channel.ts",
      "src/line/message.test.ts",
      "native-plugins/firecrawl/package.json",
      "src/not-a-plugin/file.ts",
    ]);

    expect(nativePluginIds).toEqual(["firecrawl", "line", "slack"]);
  });

  it("lists available native plugin ids", () => {
    const nativePluginIds = listAvailableNativePluginIds();

    expect(nativePluginIds).toContain("slack");
    expect(nativePluginIds).toContain("firecrawl");
    expect(nativePluginIds).toEqual(
      [...nativePluginIds].toSorted((left, right) => left.localeCompare(right)),
    );
  });

  it("dry-run still reports a plan for native plugins without tests", () => {
    const plan = readPlan(["copilot-proxy"]);

    expect(plan.nativePluginId).toBe("copilot-proxy");
    expect(plan.testFiles).toEqual([]);
  });

  it("treats native plugins without tests as a no-op by default", () => {
    const stdout = runScript(["copilot-proxy"]);

    expect(stdout).toContain("No tests found for native-plugins/copilot-proxy.");
    expect(stdout).toContain("Skipping.");
  });
});
