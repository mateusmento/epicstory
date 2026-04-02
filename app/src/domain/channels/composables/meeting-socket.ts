import { useWebSockets } from "@/core/websockets";
import type { IMeeting } from "../types";

export type IncomingMeetingPayload = {
  meeting: IMeeting;
  channelId?: number;
  calendarEventId?: string;
};

export type MeetingEndedPayload = {
  meetingId: number;
  channelId?: number;
};

type Handler<T> = (payload: T) => void;

/**
 * Thin wrapper around Socket.IO for meeting-related emits/subscriptions.
 * Intentionally splits "emit" methods from "on/off" subscription methods.
 */
export function useMeetingSocket() {
  const sockets = useWebSockets();

  function emitSubscribeMeetings(workspaceId: number) {
    sockets.websocket?.emit("subscribe-meetings", { workspaceId });
  }

  function onIncomingMeeting(handler: Handler<IncomingMeetingPayload>) {
    sockets.websocket?.off("incoming-meeting", handler);
    sockets.websocket?.on("incoming-meeting", handler);
  }

  function offIncomingMeeting(handler: Handler<IncomingMeetingPayload>) {
    sockets.websocket?.off("incoming-meeting", handler);
  }

  function onMeetingEnded(handler: Handler<MeetingEndedPayload>) {
    sockets.websocket?.off("meeting-ended", handler);
    sockets.websocket?.on("meeting-ended", handler);
  }

  function offMeetingEnded(handler: Handler<MeetingEndedPayload>) {
    sockets.websocket?.off("meeting-ended", handler);
  }

  return {
    // emits
    emitSubscribeMeetings,
    // subscriptions
    onIncomingMeeting,
    offIncomingMeeting,
    onMeetingEnded,
    offMeetingEnded,
  };
}
