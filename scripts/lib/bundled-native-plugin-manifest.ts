export type NativePluginPackageJson = {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  openclaw?: {
    install?: {
      npmSpec?: string;
    };
  };
};

export type BundledNativePlugin = { id: string; packageJson: NativePluginPackageJson };

export function collectBundledNativePluginManifestErrors(
  nativePlugins: BundledNativePlugin[],
): string[] {
  const errors: string[] = [];

  for (const nativePlugin of nativePlugins) {
    const install = nativePlugin.packageJson.openclaw?.install;
    if (
      install &&
      (!install.npmSpec || typeof install.npmSpec !== "string" || !install.npmSpec.trim())
    ) {
      errors.push(
        `bundled native plugin '${nativePlugin.id}' manifest invalid | openclaw.install.npmSpec must be a non-empty string`,
      );
    }
  }

  return errors;
}

export type ExtensionPackageJson = NativePluginPackageJson;
export type BundledExtension = BundledNativePlugin;
export const collectBundledExtensionManifestErrors = collectBundledNativePluginManifestErrors;
