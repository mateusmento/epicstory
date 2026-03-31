import type { User } from "@/domain/auth";

export interface IMeeting {
  id: number;
  channelId?: number | null;
  workspaceId?: number;
  attendees: IMeetingAttendee[];
  ongoing: boolean;
  startsAt: string;
  endedAt: string | null;
  occurrenceAt: string;
  calendarEventId: string;
}

export interface IMeetingAttendee {
  remoteId: string;
  user: User;
}
