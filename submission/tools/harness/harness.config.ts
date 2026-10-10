// Build config for the screenshot harness: the app's own build, with a
// different entry and the Canva SDK swapped for stand-ins.
import path from "node:path";
import { defineConfig } from "@canva/app-scripts";

const stub = (name: string) => path.resolve(__dirname, "stubs", `${name}.ts`);

export default defineConfig({
  entry: "./submission/tools/harness/index.tsx",
  outputDir: "submission/tools/harness/dist",
  extractTranslations: { outputDir: "submission/tools/harness/dist" },
  config: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "@canva/user": stub("canva_user"),
        "@canva/platform": stub("canva_platform"),
        "@canva/asset": stub("canva_asset"),
        "@canva/design": stub("canva_design"),
        "@canva/app-hooks": stub("canva_app_hooks"),
      },
    },
  }),
});
