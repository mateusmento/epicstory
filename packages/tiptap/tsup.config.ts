import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "vue/index": "src/vue/index.ts",
  },
  format: ["cjs", "esm"],
  /**
   * Default `true`: bundled `.d.ts` from tsup (`pnpm run build`).
   * For per-file `.d.ts` + `.d.ts.map` (IDE navigation), run `pnpm run build:dev` instead,
   * which sets `SKIP_TSUP_DTS` and follows with `tsc --emitDeclarationOnly`.
   */
  dts: !process.env.SKIP_TSUP_DTS,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
  external: [/^@tiptap\//, "vue"],
});
