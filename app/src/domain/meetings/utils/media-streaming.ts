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
  onIncomingStream?: (remoteId: string, peerMedia: MediaStream) => void | Promise<void>;
  /** Fires after the remote media stream is available and {@link onIncomingStream} has settled. */
  onMediaSessionReady?: (remoteId: string) => void;
};

export function createPeersSession(opts: PeerSessionOptions): PeerSession {
  const { rtc, media, onIncomingStream, onMediaSessionReady } = opts;

  const peers = {} as Record<string, MediaConnection>;

  rtc.on("call", async (call) => {
    const peerId = call.peer;
    call.answer(media);
    addPeer(peerId, call);
    try {
      const stream = await resolveMediaStream(call);
      await onIncomingStream?.(peerId, stream);
      onMediaSessionReady?.(peerId);
    } catch (error) {
      console.error("Incoming peer media failed", error);
      // After PeerJS replaces the MediaConnection, don't tear down the new one.
      if (peers[peerId] === call) disconnect(peerId);
    }
  });

  async function connect(remoteId: string): Promise<void> {
    const call = rtc.call(remoteId, media);
    addPeer(remoteId, call);
    call === undefined && console.log("call is undefined");
    try {
      const stream = await resolveMediaStream(call);
      await onIncomingStream?.(call.peer, stream);
      onMediaSessionReady?.(call.peer);
    } catch (error) {
      console.error("Incoming peer media failed", error);
      if (peers[remoteId] === call) disconnect(remoteId);
    }
  }

  function addPeer(remoteId: string, call: MediaConnection) {
    // Replace when PeerJS renegotiates (same peer, new MediaConnection after a follow-up offer).
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
