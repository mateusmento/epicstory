import Peer from "peerjs";
import { type Socket } from "socket.io-client";
import { createMediaStreaming, untilOpen, type MediaStreaming } from "./media-streaming";

export interface MeetingEvents {
  attendeeJoined(remoteId: string, camera: MediaStream): void;
  attendeeLeft(remoteId: string): void;
  ended(): void;
}

export class Meeting {
  private constructor(
    private meetingId: number,
    private websocket: Socket,
    private streaming: MediaStreaming,
    private events: MeetingEvents,
  ) {}

  static async join(websocket: Socket, meetingId: number, camera: MediaStream, events: MeetingEvents) {
    const rtc = await untilOpen(new Peer({ host: "localhost", port: 3001 }));
    const streaming = createMediaStreaming(rtc, camera, events.attendeeJoined);
    const meeting = new Meeting(meetingId, websocket, streaming, events);
    meeting.join();
    return meeting;
  }

  private join() {
    const { meetingId, websocket, streaming, events } = this;

    websocket.emit("join-meeting", { meetingId, remoteId: streaming.localId });

    websocket.on("attendee-joined", async ({ remoteId }) => {
      streaming.connect(remoteId);
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
