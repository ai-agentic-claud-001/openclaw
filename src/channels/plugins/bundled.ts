import { bluebubblesPlugin } from "../../../native-plugins/bluebubbles/index.js";
import { discordPlugin, setDiscordRuntime } from "../../../native-plugins/discord/index.js";
import { discordSetupPlugin } from "../../../native-plugins/discord/setup-entry.js";
import { feishuPlugin } from "../../../native-plugins/feishu/index.js";
import { imessagePlugin } from "../../../native-plugins/imessage/index.js";
import { imessageSetupPlugin } from "../../../native-plugins/imessage/setup-entry.js";
import { ircPlugin } from "../../../native-plugins/irc/index.js";
import { linePlugin, setLineRuntime } from "../../../native-plugins/line/index.js";
import { lineSetupPlugin } from "../../../native-plugins/line/setup-entry.js";
import { mattermostPlugin } from "../../../native-plugins/mattermost/index.js";
import { nextcloudTalkPlugin } from "../../../native-plugins/nextcloud-talk/index.js";
import { signalPlugin } from "../../../native-plugins/signal/index.js";
import { signalSetupPlugin } from "../../../native-plugins/signal/setup-entry.js";
import { slackPlugin } from "../../../native-plugins/slack/index.js";
import { slackSetupPlugin } from "../../../native-plugins/slack/setup-entry.js";
import { synologyChatPlugin } from "../../../native-plugins/synology-chat/index.js";
import { telegramPlugin, setTelegramRuntime } from "../../../native-plugins/telegram/index.js";
import { telegramSetupPlugin } from "../../../native-plugins/telegram/setup-entry.js";
import { zaloPlugin } from "../../../native-plugins/zalo/index.js";
import type { ChannelId, ChannelPlugin } from "./types.js";

export const bundledChannelPlugins = [
  bluebubblesPlugin,
  discordPlugin,
  feishuPlugin,
  imessagePlugin,
  ircPlugin,
  linePlugin,
  mattermostPlugin,
  nextcloudTalkPlugin,
  signalPlugin,
  slackPlugin,
  synologyChatPlugin,
  telegramPlugin,
  zaloPlugin,
] as ChannelPlugin[];

export const bundledChannelSetupPlugins = [
  telegramSetupPlugin,
  discordSetupPlugin,
  ircPlugin,
  slackSetupPlugin,
  signalSetupPlugin,
  imessageSetupPlugin,
  lineSetupPlugin,
] as ChannelPlugin[];

const bundledChannelPluginsById = new Map(
  bundledChannelPlugins.map((plugin) => [plugin.id, plugin] as const),
);

export function getBundledChannelPlugin(id: ChannelId): ChannelPlugin | undefined {
  return bundledChannelPluginsById.get(id);
}

export function requireBundledChannelPlugin(id: ChannelId): ChannelPlugin {
  const plugin = getBundledChannelPlugin(id);
  if (!plugin) {
    throw new Error(`missing bundled channel plugin: ${id}`);
  }
  return plugin;
}

export const bundledChannelRuntimeSetters = {
  setDiscordRuntime,
  setLineRuntime,
  setTelegramRuntime,
};
