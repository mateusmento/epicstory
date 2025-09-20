export const config = {
  API_URL: `http://${window.location.hostname}:3000/api`,
  WEBSOCKET_URI: `http://${window.location.hostname}:3000`,
  PEERJS_SERVER_HOST: window.location.hostname,
  PEERJS_SERVER_PATH: "/peerjs",
  PEERJS_SERVER_PORT: 3001,
};

export async function loadConfig() {
  const { default: appConfig } = await import("@/config.extension");
  Object.assign(config, appConfig);
}
