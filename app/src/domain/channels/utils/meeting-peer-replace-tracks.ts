import type { MediaConnection } from "peerjs";
import { isDisplayCaptureVideoTrack } from "./meeting-screen-share";

type MediaConnectionWithPc = MediaConnection & { peerConnection?: RTCPeerConnection };

function peerConnectionFor(remoteId: string, getConnection: (id: string) => MediaConnection | undefined) {
  const conn = getConnection(remoteId) as MediaConnectionWithPc | undefined;
  return conn?.peerConnection;
}

/**
 * Point outbound camera/mic RTCRtpSenders at the given tracks. Display-capture (screen) senders are
 * left unchanged so a mid-share device refresh does not swap the outbound screen for a new camera.
 */
export function replaceOutgoingTracksForPeers(
  videoTrack: MediaStreamTrack | undefined,
  audioTrack: MediaStreamTrack | undefined,
  getConnection: (remoteId: string) => MediaConnection | undefined,
  remotePeerIds: readonly string[],
) {
  for (const id of remotePeerIds) {
    const pc = peerConnectionFor(id, getConnection);
    if (!pc || pc.signalingState === "closed") continue;

    for (const sender of pc.getSenders()) {
      const t = sender.track;
      if (t?.kind === "video" && videoTrack && !isDisplayCaptureVideoTrack(t)) {
        void sender.replaceTrack(videoTrack);
      } else if (t?.kind === "audio" && audioTrack) {
        void sender.replaceTrack(audioTrack);
      }
    }
  }
}

/**
 * Replaces the first outbound video sender’s track (camera ↔ screen). Uses {@link RTCRtpSender.replaceTrack}
 * only — no SDP renegotiation.
 */
export function replaceOutgoingVideoTrackForPeers(
  videoTrack: MediaStreamTrack | undefined,
  getConnection: (remoteId: string) => MediaConnection | undefined,
  remotePeerIds: readonly string[],
) {
  if (!videoTrack) return;
  for (const id of remotePeerIds) {
    const pc = peerConnectionFor(id, getConnection);
    if (!pc || pc.signalingState === "closed") continue;
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind === "video") {
        void sender.replaceTrack(videoTrack);
        break;
      }
    }
  }
}
