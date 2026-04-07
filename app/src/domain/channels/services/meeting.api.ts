import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { IMeeting } from "../types";
import type { CalendarEventDto } from "@/domain/calendar";
import type { User } from "@/domain/auth";

export type LiveScheduledMeeting = {
  meeting: IMeeting;
  calendarEvent: CalendarEventDto;
  participantsPreview: User[];
};

@injectable()
export class MeetingApi {
  constructor(@InjectAxios() private axios: Axios) {}

  findAttendees({ meetingId, ...query }: { remoteId?: string; meetingId: number }) {
    return this.axios.get(`/meetings/${meetingId}/attendees`, { params: query }).then((res) => res.data);
  }

  findLiveScheduledMeeting(workspaceId: number) {
    return this.axios
      .get<LiveScheduledMeeting | null>(`/workspaces/${workspaceId}/meetings/live-scheduled`)
      .then((res) => res.data);
  }
}
