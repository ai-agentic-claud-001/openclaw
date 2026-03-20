import { beforeEach, describe, vi } from "vitest";
import { __testing as discordThreadBindingTesting } from "../../../../native-plugins/discord/src/monitor/thread-bindings.manager.js";
import { __testing as feishuThreadBindingTesting } from "../../../../native-plugins/feishu/src/thread-bindings.js";
import { resetMatrixThreadBindingsForTests } from "../../../../native-plugins/matrix/api.js";
import { __testing as telegramThreadBindingTesting } from "../../../../native-plugins/telegram/src/thread-bindings.js";
import { __testing as sessionBindingTesting } from "../../../infra/outbound/session-binding-service.js";
import { sessionBindingContractRegistry } from "./registry.js";
import { installSessionBindingContractSuite } from "./suites.js";

vi.mock("../../../../native-plugins/matrix/src/matrix/send.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../native-plugins/matrix/src/matrix/send.js")
  >("../../../../native-plugins/matrix/src/matrix/send.js");
  return {
    ...actual,
    sendMessageMatrix: vi.fn(
      async (_to: string, _message: string, opts?: { threadId?: string }) => ({
        messageId: opts?.threadId ? "$reply" : "$root",
        roomId: "!room:example",
      }),
    ),
  };
});

beforeEach(async () => {
  sessionBindingTesting.resetSessionBindingAdaptersForTests();
  discordThreadBindingTesting.resetThreadBindingsForTests();
  feishuThreadBindingTesting.resetFeishuThreadBindingsForTests();
  resetMatrixThreadBindingsForTests();
  await telegramThreadBindingTesting.resetTelegramThreadBindingsForTests();
});

for (const entry of sessionBindingContractRegistry) {
  describe(`${entry.id} session binding contract`, () => {
    installSessionBindingContractSuite({
      expectedCapabilities: entry.expectedCapabilities,
      getCapabilities: entry.getCapabilities,
      bindAndResolve: entry.bindAndResolve,
      unbindAndVerify: entry.unbindAndVerify,
      cleanup: entry.cleanup,
    });
  });
}
