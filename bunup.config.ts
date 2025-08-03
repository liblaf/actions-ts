import path from "node:path";
import { type DefineConfigItem, defineConfig } from "bunup";
import { exports, shims } from "bunup/plugins";

const baseActionConfig: Omit<DefineConfigItem, "entry"> = {
  format: ["esm"],
  minify: true,
  dts: true,
  preferredTsconfigPath: ".config/copier/tsconfig.build.json",
  noExternal: [/.*/],
  target: "node",
  sourcemap: "linked",
  plugins: [shims(), exports()],
};

function defineActionConfig(p: string): DefineConfigItem {
  return {
    ...baseActionConfig,
    entry: [path.join(p, "src", "index.ts"), path.join(p, "src", "main.ts")],
    outDir: path.join(p, "dist"),
  };
}

export default defineConfig([defineActionConfig("approve")]);
