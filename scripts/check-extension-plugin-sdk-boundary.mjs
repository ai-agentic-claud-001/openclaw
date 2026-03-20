import path from "node:path";
import { pathToFileURL } from "node:url";
import { main } from "./check-native-plugin-plugin-sdk-boundary.mjs";

export * from "./check-native-plugin-plugin-sdk-boundary.mjs";

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";

if (import.meta.url === entryHref) {
  await main();
}
