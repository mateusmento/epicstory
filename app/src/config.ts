export const config = {
  // Default to same-origin so local HTTPS reverse-proxy (Caddy) works without mixed content / CORS.
  // For legacy direct-to-port dev, override via `app/src/config.extension.ts`.
  API_URL: `${window.location.origin}/api`,
  WEBSOCKET_URI: window.location.origin,
  PEERJS_SERVER_HOST: window.location.hostname,
  PEERJS_SERVER_PATH: "/peerjs",
  // When behind HTTPS reverse proxy, PeerJS is served on 443 (proxied to 3001).
  PEERJS_SERVER_PORT: window.location.protocol === "https:" ? 443 : 3001,
  PEERJS_SERVER_SECURE: window.location.protocol === "https:",
};

export async function loadConfig() {
  const { default: appConfig } = await import("@/config.extension");
  Object.assign(config, appConfig);
}
