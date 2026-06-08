import type { IUser as IUser } from "@epicstory/contracts";

export type MeetingParticipant = {
  id: string;
  stream: MediaStream | null;
  user: IUser | null;
  isLocal: boolean;
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
  isScreenSharing: boolean;
  streamEpoch: number;
};

export type MeetingTileRole = "featured" | "dock" | "grid";
