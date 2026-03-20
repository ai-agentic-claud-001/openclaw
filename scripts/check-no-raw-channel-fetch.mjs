#!/usr/bin/env node

import ts from "typescript";
import { runCallsiteGuard } from "./lib/callsite-guard.mjs";
import { runAsScript, toLine, unwrapExpression } from "./lib/ts-guard-utils.mjs";

const sourceRoots = ["src/channels", "src/routing", "src/line", "extensions"];

// Temporary allowlist for legacy callsites. New raw fetch callsites in channel/plugin runtime
// code should be rejected and migrated to fetchWithSsrFGuard/shared channel helpers.
const allowedRawFetchCallsites = new Set([
  "native-plugins/bluebubbles/src/types.ts:133",
  "native-plugins/feishu/src/streaming-card.ts:31",
  "native-plugins/feishu/src/streaming-card.ts:101",
  "native-plugins/feishu/src/streaming-card.ts:143",
  "native-plugins/feishu/src/streaming-card.ts:199",
  "native-plugins/googlechat/src/api.ts:22",
  "native-plugins/googlechat/src/api.ts:43",
  "native-plugins/googlechat/src/api.ts:63",
  "native-plugins/googlechat/src/api.ts:188",
  "native-plugins/googlechat/src/auth.ts:82",
  "native-plugins/matrix/src/directory-live.ts:41",
  "native-plugins/matrix/src/matrix/client/config.ts:171",
  "native-plugins/mattermost/src/mattermost/client.ts:211",
  "native-plugins/mattermost/src/mattermost/monitor.ts:230",
  "native-plugins/mattermost/src/mattermost/probe.ts:27",
  "native-plugins/minimax/oauth.ts:62",
  "native-plugins/minimax/oauth.ts:93",
  "native-plugins/msteams/src/graph.ts:39",
  "native-plugins/nextcloud-talk/src/room-info.ts:92",
  "native-plugins/nextcloud-talk/src/send.ts:107",
  "native-plugins/nextcloud-talk/src/send.ts:198",
  "native-plugins/qwen-portal-auth/oauth.ts:46",
  "native-plugins/qwen-portal-auth/oauth.ts:80",
  "native-plugins/talk-voice/index.ts:27",
  "native-plugins/thread-ownership/index.ts:105",
  "native-plugins/voice-call/src/providers/plivo.ts:95",
  "native-plugins/voice-call/src/providers/telnyx.ts:61",
  "native-plugins/voice-call/src/providers/tts-openai.ts:111",
  "native-plugins/voice-call/src/providers/twilio/api.ts:23",
  "native-plugins/telegram/src/api-fetch.ts:8",
  "native-plugins/discord/src/send.outbound.ts:363",
  "native-plugins/discord/src/voice-message.ts:268",
  "native-plugins/discord/src/voice-message.ts:312",
  "native-plugins/slack/src/monitor/media.ts:55",
  "native-plugins/slack/src/monitor/media.ts:59",
  "native-plugins/slack/src/monitor/media.ts:73",
  "native-plugins/slack/src/monitor/media.ts:99",
]);

function isRawFetchCall(expression) {
  const callee = unwrapExpression(expression);
  if (ts.isIdentifier(callee)) {
    return callee.text === "fetch";
  }
  if (ts.isPropertyAccessExpression(callee)) {
    return (
      ts.isIdentifier(callee.expression) &&
      callee.expression.text === "globalThis" &&
      callee.name.text === "fetch"
    );
  }
  return false;
}

export function findRawFetchCallLines(content, fileName = "source.ts") {
  const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
  const lines = [];
  const visit = (node) => {
    if (ts.isCallExpression(node) && isRawFetchCall(node.expression)) {
      lines.push(toLine(sourceFile, node.expression));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return lines;
}

export async function main() {
  await runCallsiteGuard({
    importMetaUrl: import.meta.url,
    sourceRoots,
    extraTestSuffixes: [".browser.test.ts", ".node.test.ts"],
    findCallLines: findRawFetchCallLines,
    allowCallsite: (callsite) => allowedRawFetchCallsites.has(callsite),
    header: "Found raw fetch() usage in channel/plugin runtime sources outside allowlist:",
    footer: "Use fetchWithSsrFGuard() or existing channel/plugin SDK wrappers for network calls.",
  });
}

runAsScript(import.meta.url, main);
