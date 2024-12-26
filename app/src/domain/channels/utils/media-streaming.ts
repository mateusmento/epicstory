import Peer, { type MediaConnection } from "peerjs";

export const untilOpen = (peer: Peer) =>
  new Promise<Peer>((res, rej) => {
    peer.on("open", () => res(peer));
    peer.on("error", (error) => rej(error));
  });

const getStream = (conn: MediaConnection) =>
  new Promise<MediaStream>((res) => conn.on("stream", (stream) => res(stream)));

export interface MediaStreaming {
  localId: string;
  connect: (remoteId: string) => void;
  disconnect: (remoteId: string) => void;
  close: () => void;
}

export function createMediaStreaming({
  rtc,
  media,
  mediaAdded,
}: {
  rtc: Peer;
  media: MediaStream;
  mediaAdded?: (remoteId: string, peerMedia: MediaStream) => void;
}): MediaStreaming {
  const peers = {} as Record<string, MediaConnection>;

  rtc.on("call", async (call) => {
    call.answer(media);
    addPeer(call.peer, call);
    const stream = await getStream(call);
    mediaAdded?.(call.peer, stream);
  });

  async function connect(remoteId: string) {
    const call = rtc.call(remoteId, media);
    addPeer(remoteId, call);
    call === undefined && console.log("call is undefined");
    const stream = await getStream(call);
    mediaAdded?.(remoteId, stream);
  }

  function addPeer(remoteId: string, call: MediaConnection) {
    if (remoteId in peers) return;
    peers[remoteId] = call;
  }

  function disconnect(remoteId: string) {
    if (!peers[remoteId]) return;
    peers[remoteId].close();
    delete peers[remoteId];
  }

  function close() {
    rtc.destroy();
  }

  return {
    localId: rtc.id,
    connect,
    disconnect,
    close,
  };
}
