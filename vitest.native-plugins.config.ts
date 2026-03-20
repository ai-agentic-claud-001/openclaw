import { channelTestExclude } from "./vitest.channel-paths.mjs";
import { createScopedVitestConfig } from "./vitest.scoped-config.ts";

export default createScopedVitestConfig(["native-plugins/**/*.test.ts"], {
  // Channel implementations live under native-plugins/ but are tested by
  // vitest.channels.config.ts (pnpm test:channels) which provides
  // the heavier mock scaffolding they need.
  exclude: channelTestExclude.filter((pattern) => pattern.startsWith("native-plugins/")),
});
