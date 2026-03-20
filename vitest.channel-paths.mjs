export const channelTestRoots = [
  "native-plugins/telegram",
  "native-plugins/discord",
  "native-plugins/whatsapp",
  "native-plugins/slack",
  "native-plugins/signal",
  "native-plugins/imessage",
  "src/browser",
  "src/line",
];

export const channelTestPrefixes = channelTestRoots.map((root) => `${root}/`);
export const channelTestInclude = channelTestRoots.map((root) => `${root}/**/*.test.ts`);
export const channelTestExclude = channelTestRoots.map((root) => `${root}/**`);
