import fs from "node:fs/promises";
import path from "node:path";
import type { BuildOptions, Plugin } from "bunup";
import { defineConfig } from "bunup";
import { copy, exports, shims } from "bunup/plugins";

const actions: string[] = ["approve", "pre", "release", "template"];

export default defineConfig({
  entry: actions.flatMap((action: string): string[] => [
    path.join(action, "src", "index.ts"),
    path.join(action, "src", "main.ts"),
  ]),
  format: ["esm", "cjs", "iife"],
  minify: true,
  splitting: false,
  dts: true,
  preferredTsconfigPath: ".config/copier/tsconfig.build.json",
  noExternal: [/.*/],
  target: "node",
  sourcemap: "inline",
  async onSuccess(_options: Partial<BuildOptions>): Promise<void> {
    for (const action of actions) {
      if (await fs.exists(path.join("dist", action, "src"))) {
        await fs.rename(
          path.join("dist", action, "src"),
          path.join("dist", action, "dist"),
        );
      }
    }
  },
  plugins: [
    shims(),
    exports(),
    ...actions.map(
      (action: string): Plugin =>
        copy(
          [
            path.join(action, ".env"),
            path.join(action, "action.yaml"),
            path.join(action, "README.md"),
          ],
          path.join("dist", action),
        ),
    ),
  ],
});
