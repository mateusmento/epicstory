import type { User } from "@/domain/auth";

export interface IMeeting {
  id: number;
  channelId?: number | null;
  workspaceId?: number;
  attendees: IMeetingAttendee[];
}

export interface IMeetingAttendee {
  remoteId: string;
  user: User;
}
