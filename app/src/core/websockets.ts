import { config } from "@/config";
import { defineStore } from "pinia";
import { type Socket, io } from "socket.io-client";

const useWebSocketsStore = defineStore<"websockets", { websocket: Socket }>("websockets", () => {
  const websocket = io(config.WEBSOCKET_URI, {
    path: "/api/socket.io",
    transports: ["websocket"],
    withCredentials: true,
  }) as Socket;
  return { websocket };
});

export function useWebSockets(): { websocket: Socket } {
  const store = useWebSocketsStore();
  return { websocket: store.websocket as Socket };
}
