export const config = {
  API_URL: "http://localhost:3000/api",
  WEBSOCKET_URI: "http://localhost:3000",
  PEERJS_SERVER_HOST: "localhost",
  PEERJS_SERVER_PORT: 3001,
};

export async function loadConfig() {
  const { default: appConfig } = await import("@/app/config");
  Object.assign(config, appConfig);
}
