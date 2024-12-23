import type { User } from "@/domain/auth";
import { MeetingApi } from "@/domain/channels/services/meeting.api";
import Peer from "peerjs";
import { type Socket } from "socket.io-client";
import { createMediaStreaming, untilOpen, type MediaStreaming } from "./media-streaming";

export interface MeetingEvents {
  attendeeJoined(remoteId: string, camera: MediaStream, user: User): void;
  attendeeLeft(remoteId: string): void;
  ended(): void;
}

export type MeetingOptions = MeetingEvents & {
  meetingApi: MeetingApi;
};

export class Meeting {
  private constructor(
    private meetingId: number,
    private websocket: Socket,
    private streaming: MediaStreaming,
    private events: MeetingEvents,
  ) {}

  static async join(
    websocket: Socket,
    meetingId: number,
    camera: MediaStream,
    { meetingApi, ...events }: MeetingOptions,
  ) {
    const rtc = await untilOpen(new Peer({ host: "localhost", port: 3001 }));

    const streaming = createMediaStreaming({
      rtc,
      media: camera,
      findUser: async (remoteId) => {
        const [attendee] = await meetingApi.findAttendees({ remoteId, meetingId });
        return attendee?.user;
      },
      mediaAdded: events.attendeeJoined,
    });

    const meeting = new Meeting(meetingId, websocket, streaming, events);
    meeting.join();
    return meeting;
  }

  private join() {
    const { meetingId, websocket, streaming, events } = this;

    websocket.emit("join-meeting", { meetingId, remoteId: streaming.localId });

    websocket.on("attendee-joined", async ({ remoteId, user }) => {
      streaming.connect(remoteId, user);
    });

    websocket.on("attendee-left", ({ remoteId }) => {
      streaming.disconnect(remoteId);
      events.attendeeLeft(remoteId);
    });

    websocket.on("meeting-ended", () => {
      streaming.close();
      events.ended();
    });
  }

  leave() {
    this.websocket.emit("leave-meeting", { meetingId: this.meetingId, remoteId: this.streaming.localId });
    this.streaming.close();
  }

  end() {
    this.websocket.emit("end-meeting", { meetingId: this.meetingId });
    this.streaming.close();
  }

  private removeListeners() {
    this.websocket.off("attendee-left");
    this.websocket.off("attendee-joined");
    this.websocket.off("meeting-ended");
  }
}
