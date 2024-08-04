import Peer, { type MediaConnection } from "peerjs";
import { type Socket } from "socket.io-client";

export interface MeetingEvents {
  attendeeJoined(remoteId: string, camera: MediaStream): void;
  attendeeLeft(remoteId: string): void;
  ended(): void;
}

const getStream = (conn: MediaConnection) =>
  new Promise<MediaStream>((res) => conn.on("stream", (stream) => res(stream)));

const awaitUntilOpen = (peer: Peer) =>
  new Promise<Peer>((res, rej) => {
    peer.on("open", () => res(peer));
    peer.on("error", (error) => rej(error));
  });

export class Meeting {
  private constructor(
    private meetingId: number,
    private websocket: Socket,
    private rtc: Peer,
    private events: MeetingEvents,
  ) {}

  static async join(websocket: Socket, meetingId: number, camera: MediaStream, events: MeetingEvents) {
    const rtc = await awaitUntilOpen(new Peer({ host: "localhost", port: 3001 }));
    const meeting = new Meeting(meetingId, websocket, rtc, events);
    await meeting.join(camera);
    return meeting;
  }

  private async join(camera: MediaStream) {
    const peers = {} as Record<string, MediaConnection>;
    const { meetingId, websocket, rtc, events } = this;

    websocket.emit("join-meeting", { meetingId, remoteId: rtc.id });

    websocket.on("attendee-joined", async ({ remoteId }) => {
      const call = rtc.call(remoteId, camera);
      const peerCamera = await getStream(call);
      addPeer(remoteId, call, peerCamera);
    });

    function addPeer(remoteId: string, call: MediaConnection, camera: MediaStream) {
      if (remoteId in peers) return;
      peers[remoteId] = call;
      events.attendeeJoined(remoteId, camera);
    }

    rtc.on("call", async (call) => {
      call.answer(camera);
      const peerCamera = await getStream(call);
      addPeer(call.peer, call, peerCamera);
    });

    websocket.on("attendee-left", ({ remoteId }) => {
      if (!(remoteId in peers)) return;
      peers[remoteId].close();
      delete peers[remoteId];
      events.attendeeLeft(remoteId);
    });

    websocket.on("meeting-ended", () => {
      this.close();
      events.ended();
    });
  }

  leave() {
    this.websocket.emit("leave-meeting", { meetingId: this.meetingId, remoteId: this.rtc.id });
    this.close();
  }

  end() {
    this.websocket.emit("end-meeting", { meetingId: this.meetingId });
    this.close();
  }

  private close() {
    // this.websocket.disconnect();
    this.rtc.destroy();
  }
}
