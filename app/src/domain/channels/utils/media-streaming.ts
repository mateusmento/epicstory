import Peer, { type MediaConnection } from "peerjs";

export const untilOpen = (peer: Peer) =>
  new Promise<Peer>((res, rej) => {
    peer.on("open", () => res(peer));
    peer.on("error", (error) => rej(error));
  });

export function resolveMediaStream(call: MediaConnection, timeoutMs = 60_000) {
  return new Promise<MediaStream>((res, rej) => {
    let settled = false;

    const timeout = setTimeout(() => {
      finish(() => rej(new Error(`WebRTC connection timeout after ${timeoutMs}ms`)));
    }, timeoutMs);

    function finish(fn: () => void) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fn();
    }

    call.on("stream", (stream) => finish(() => res(stream)));
    call.on("error", (error) => finish(() => rej(error)));
    call.on("close", () => finish(() => rej(new Error("WebRTC connection closed"))));
  });
}

export interface PeerSession {
  localId: string;
  connect: (remoteId: string) => Promise<void>;
  disconnect: (remoteId: string) => void;
  close: () => void;
  getConnection: (remoteId: string) => MediaConnection | undefined;
}

export type PeerSessionOptions = {
  rtc: Peer;
  media: MediaStream;
  onIncomingStream?: (remoteId: string, peerMedia: MediaStream) => void;
};

export function createPeersSession(opts: PeerSessionOptions): PeerSession {
  const { rtc, media, onIncomingStream } = opts;

  const peers = {} as Record<string, MediaConnection>;

  rtc.on("call", async (call) => {
    call.answer(media);
    addPeer(call.peer, call);
    try {
      const stream = await resolveMediaStream(call);
      onIncomingStream?.(call.peer, stream);
    } catch (error) {
      console.error("Incoming peer media failed", error);
      disconnect(call.peer);
    }
  });

  async function connect(remoteId: string): Promise<void> {
    const call = rtc.call(remoteId, media);
    addPeer(remoteId, call);
    call === undefined && console.log("call is undefined");
    try {
      const stream = await resolveMediaStream(call);
      onIncomingStream?.(call.peer, stream);
    } catch (error) {
      console.error("Incoming peer media failed", error);
      disconnect(call.peer);
    }
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

  function getConnection(remoteId: string) {
    return peers[remoteId];
  }

  return {
    localId: rtc.id,
    connect,
    disconnect,
    close,
    getConnection,
  };
}
