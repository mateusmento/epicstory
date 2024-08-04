import { useAuth } from "@/domain/auth";
import { defineStore } from "pinia";
import { type Socket, io } from "socket.io-client";

const useWebSocketsStore = defineStore<"websockets", { websocket: Socket }>("websockets", () => {
  const auth = useAuth();
  const websocket = io("http://localhost:3000", {
    withCredentials: true,
    extraHeaders: {
      Authorization: auth.token.value.replace("Bearer ", ""),
    },
  }) as Socket;
  return { websocket };
});

export function useWebSockets(): { websocket: Socket } {
  const store = useWebSocketsStore();
  return { websocket: store.websocket as Socket };
}
