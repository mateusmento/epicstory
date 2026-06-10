import { useWebSockets } from "@/core/websockets";
import type { IncomingMeetingEvent, MeetingEndedEvent, SubscribeMeetingsBody } from "@epicstory/contracts";

export type IncomingMeetingPayload = IncomingMeetingEvent;
export type MeetingEndedPayload = MeetingEndedEvent;

type Handler<T> = (payload: T) => void;

/**
 * Thin wrapper around Socket.IO for meeting-related emits/subscriptions.
 * Intentionally splits "emit" methods from "on/off" subscription methods.
 */
export function useMeetingSocket() {
  const sockets = useWebSockets();

  function emitSubscribeMeetings(workspaceId: number) {
    const body = { workspaceId } satisfies SubscribeMeetingsBody;
    sockets.websocket?.emit("subscribe-meetings", body);
  }

  function onIncomingMeeting(handler: Handler<IncomingMeetingEvent>) {
    sockets.websocket?.off("incoming-meeting", handler);
    sockets.websocket?.on("incoming-meeting", handler);
  }

  function offIncomingMeeting(handler: Handler<IncomingMeetingEvent>) {
    sockets.websocket?.off("incoming-meeting", handler);
  }

  function onMeetingEnded(handler: Handler<MeetingEndedEvent>) {
    sockets.websocket?.off("meeting-ended", handler);
    sockets.websocket?.on("meeting-ended", handler);
  }

  function offMeetingEnded(handler: Handler<MeetingEndedEvent>) {
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
