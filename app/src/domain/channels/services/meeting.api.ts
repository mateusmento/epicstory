import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";

export type LiveScheduledMeeting = {
  meeting: {
    id: number;
    workspaceId: number;
    startsAt: string;
    endedAt: string | null;
    channelId: number | null;
    calendarEventId: string;
    occurrenceAt: string;
  };
  calendarEvent: {
    id: string;
    title: string;
    channelId: number | null;
    isPublic: boolean;
  };
  participantsPreview: Array<{ id: number; name: string; picture?: string | null }>;
};

@injectable()
export class MeetingApi {
  constructor(@InjectAxios() private axios: Axios) {}

  findAttendees({ meetingId, ...query }: { remoteId?: string; meetingId: number }) {
    return this.axios
      .get(`/meetings/${meetingId}/attendees`, { params: query })
      .then((res) => res.data);
  }

  findLiveScheduledMeeting(workspaceId: number) {
    return this.axios
      .get<LiveScheduledMeeting | null>(`/workspaces/${workspaceId}/meetings/live-scheduled`)
      .then((res) => res.data);
  }
}
