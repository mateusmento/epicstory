import type { MediaConnection } from "peerjs";

type MediaConnectionWithPc = MediaConnection & { peerConnection?: RTCPeerConnection };

/**
 * Point all outbound RTCRtpSenders at the given tracks so peers keep receiving media after
 * the local {@link MediaStream} tracks are swapped (PeerJS keeps the same stream reference).
 */
export function replaceOutgoingTracksForPeers(
  videoTrack: MediaStreamTrack | undefined,
  audioTrack: MediaStreamTrack | undefined,
  getConnection: (remoteId: string) => MediaConnection | undefined,
  remotePeerIds: readonly string[],
) {
  for (const id of remotePeerIds) {
    const conn = getConnection(id) as MediaConnectionWithPc | undefined;
    const pc = conn?.peerConnection;
    if (!pc || pc.signalingState === "closed") continue;

    for (const sender of pc.getSenders()) {
      const kind = sender.track?.kind;
      if (kind === "video" && videoTrack) {
        void sender.replaceTrack(videoTrack);
      } else if (kind === "audio" && audioTrack) {
        void sender.replaceTrack(audioTrack);
      }
    }
  }
}
