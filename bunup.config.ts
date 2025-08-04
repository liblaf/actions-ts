import fs from "node:fs/promises";
import path from "node:path";
import type { BuildOptions, Plugin } from "bunup";
import { defineConfig } from "bunup";
import { copy, exports, shims } from "bunup/plugins";

const ACTIONS: string[] = [
  "approve",
  "authenticate",
  "changelog",
  "commit",
  "copier-update",
  "pr-label",
  "pre",
  "release",
  "template",
];

export default defineConfig({
  entry: ACTIONS.flatMap((action: string): string[] => [
    path.join(action, "src", "index.ts"),
    path.join(action, "src", "main.ts"),
  ]),
  format: ["esm"], // reduce bundle size
  minify: true,
  splitting: false,
  dts: true,
  preferredTsconfigPath: ".config/copier/tsconfig.build.json",
  noExternal: [/.*/],
  target: "node",
  sourcemap: "inline",
  async onSuccess(_options: Partial<BuildOptions>): Promise<void> {
    for (const action of ACTIONS) {
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
    ...(await Promise.all(
      ACTIONS.map(async (action: string): Promise<Plugin> => {
        const sources: string[] = (await fs.readdir(action))
          .filter((child: string): boolean => child !== "src")
          .map((child: string): string => path.join(action, child));
        return copy(sources, path.join("dist", action));
      }),
    )),
  ],
});
