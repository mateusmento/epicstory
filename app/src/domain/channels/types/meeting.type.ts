import type { User } from "@/domain/auth";

export interface IMeeting {
  id: number;
  attendees: IMeetingAttendee[];
}

export interface IMeetingAttendee {
  remoteId: string;
  user: User;
}
