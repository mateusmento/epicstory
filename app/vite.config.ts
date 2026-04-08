import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useProxyHmr = env.VITE_PROXY_HMR === "true";

  return {
    server: {
      port: 8080,
      host: true,
      open: true,
      ...(useProxyHmr
        ? {
            hmr: {
              host: env.VITE_HMR_HOST || "epicstory.io",
              protocol: (env.VITE_HMR_PROTOCOL as any) || "wss",
              clientPort: Number(env.VITE_HMR_CLIENT_PORT || 443),
            },
          }
        : {}),
    },
    plugins: [vue(), vueJsx(), vueDevTools()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
