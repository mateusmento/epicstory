import { fileURLToPath } from "node:url";
import { mergeConfig, defineConfig, configDefaults } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  // `viteConfig` is a Vite `UserConfigExport` function; cast to keep TS happy under vue-tsc build mode.
  viteConfig as any,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      exclude: [...configDefaults.exclude, "e2e/**"],
      root: fileURLToPath(new URL("./", import.meta.url)),
    },
  }),
);
