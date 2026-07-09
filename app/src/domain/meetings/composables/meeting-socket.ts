import { useWebSockets } from "@/core/websockets";
import type {
  IncomingAttendeeEvent,
  IncomingMeetingEvent,
  LeavingAttendeeEvent,
  MeetingEndedEvent,
  SubscribeMeetingsBody,
} from "@epicstory/contracts";

export type IncomingMeetingPayload = IncomingMeetingEvent;
export type MeetingEndedPayload = MeetingEndedEvent;
export type IncomingAttendeePayload = IncomingAttendeeEvent;
export type LeavingAttendeePayload = LeavingAttendeeEvent;

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

  function onIncomingAttendee(handler: Handler<IncomingAttendeeEvent>) {
    sockets.websocket?.off("incoming-attendee", handler);
    sockets.websocket?.on("incoming-attendee", handler);
  }

  function offIncomingAttendee(handler: Handler<IncomingAttendeeEvent>) {
    sockets.websocket?.off("incoming-attendee", handler);
  }

  function onLeavingAttendee(handler: Handler<LeavingAttendeeEvent>) {
    sockets.websocket?.off("leaving-attendee", handler);
    sockets.websocket?.on("leaving-attendee", handler);
  }

  function offLeavingAttendee(handler: Handler<LeavingAttendeeEvent>) {
    sockets.websocket?.off("leaving-attendee", handler);
  }

  return {
    // emits
    emitSubscribeMeetings,
    // subscriptions
    onIncomingMeeting,
    offIncomingMeeting,
    onMeetingEnded,
    offMeetingEnded,
    onIncomingAttendee,
    offIncomingAttendee,
    onLeavingAttendee,
    offLeavingAttendee,
  };
}
