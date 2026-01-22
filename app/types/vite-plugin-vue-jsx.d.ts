declare module "@vitejs/plugin-vue-jsx" {
  import type { Plugin } from "vite";

  export type VueJsxOptions = Record<string, any>;

  export default function vueJsx(options?: VueJsxOptions): Plugin;
}

