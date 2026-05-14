import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["cjs", "esm"],
  dts: !process.env.SKIP_TSUP_DTS,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
  external: [
    /^@tiptap\//,
    "@epicstory/contracts",
    "axios",
    "tsyringe",
    "reflect-metadata",
  ],
});
