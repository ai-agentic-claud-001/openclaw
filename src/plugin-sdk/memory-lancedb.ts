// Narrow plugin-sdk surface for the bundled memory-lancedb plugin.
// Keep this list additive and scoped to symbols used under native-plugins/memory-lancedb.

export { definePluginEntry } from "./core.js";
export type { OpenClawPluginApi } from "../plugins/types.js";
