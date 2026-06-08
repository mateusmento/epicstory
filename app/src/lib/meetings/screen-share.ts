import type { MeetingTileRole } from "./types";

/**
 * Local preview only: camera+audio stay on {@link mycamera}; screen is sent via {@link RTCRtpSender.replaceTrack}
 * and must be composed here for tile layout.
 */
export function compositeLocalMeetingMedia(
  mycamera: MediaStream | null,
  screenTrack: MediaStreamTrack | null,
): MediaStream | null {
  if (!mycamera && !screenTrack) return null;
  const ms = new MediaStream();
  if (mycamera) {
    mycamera.getAudioTracks().forEach((t) => ms.addTrack(t));
    mycamera.getVideoTracks().forEach((t) => ms.addTrack(t));
  }
  if (screenTrack && screenTrack.readyState !== "ended") ms.addTrack(screenTrack);
  return ms;
}

/** Display-capture tracks expose `displaySurface`; getUserMedia camera tracks do not. */
export function isDisplayCaptureVideoTrack(track: MediaStreamTrack): boolean {
  if (track.kind !== "video") return false;
  const s = track.getSettings() as MediaTrackSettings & { displaySurface?: string };
  return s.displaySurface != null && s.displaySurface !== "";
}

export function isPresentationLikeVideoTrack(track: MediaStreamTrack): boolean {
  if (isDisplayCaptureVideoTrack(track)) return true;
  const l = (track.label || "").toLowerCase();
  return l.includes("screen") || l.includes("display") || l.includes("window") || l.includes("monitor");
}

export function partitionMeetingVideoTracks(stream: MediaStream | null | undefined): {
  camera: MediaStreamTrack | null;
  screen: MediaStreamTrack | null;
  audio: MediaStreamTrack[];
} {
  if (!stream) {
    return { camera: null, screen: null, audio: [] };
  }
  const videos = stream.getVideoTracks();
  const screen = videos.find(isDisplayCaptureVideoTrack) ?? null;
  const camera =
    videos.find((t) => !isDisplayCaptureVideoTrack(t)) ?? (screen ? null : (videos[0] ?? null)) ?? null;
  return { camera, screen, audio: stream.getAudioTracks() };
}

export function meetingTileVisualStreams(
  stream: MediaStream | null,
  isCameraOn: boolean,
  role: MeetingTileRole,
): { main: MediaStream | null; pip: MediaStream | null } {
  if (!stream) return { main: null, pip: null };
  const { camera, screen, audio } = partitionMeetingVideoTracks(stream);
  const screenLive = !!screen && screen.readyState === "live";
  const cameraLive = !!camera && camera.readyState === "live" && isCameraOn;

  if (role === "dock") {
    if (cameraLive && camera) {
      return { main: new MediaStream([camera, ...audio]), pip: null };
    }
    return { main: null, pip: null };
  }

  if (screenLive && screen) {
    const main = new MediaStream([screen, ...audio]);
    const pip = cameraLive && camera ? new MediaStream([camera]) : null;
    return { main, pip };
  }

  if (cameraLive && camera) {
    return { main: new MediaStream([camera, ...audio]), pip: null };
  }

  return { main: null, pip: null };
}
