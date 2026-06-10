import { config } from "@/config";
import type { ClientToServerEvents, ServerToClientEvents } from "@epicstory/contracts";
import { defineStore } from "pinia";
import { type Socket, io } from "socket.io-client";

export type EpicstorySocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const useWebSocketsStore = defineStore<"websockets", { websocket: EpicstorySocket }>("websockets", () => {
  const websocket = io(config.WEBSOCKET_URI, {
    path: "/api/socket.io",
    transports: ["websocket"],
    withCredentials: true,
  }) as EpicstorySocket;
  return { websocket };
});

export function useWebSockets(): { websocket: EpicstorySocket } {
  const store = useWebSocketsStore();
  return { websocket: store.websocket as EpicstorySocket };
}
