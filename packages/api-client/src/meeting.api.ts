import type { LiveScheduledMeeting } from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

@injectable()
export class MeetingApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  findAttendees({
    meetingId,
    ...query
  }: {
    remoteId?: string;
    meetingId: number;
  }) {
    return this.axios
      .get(`/meetings/${meetingId}/attendees`, { params: query })
      .then((res) => res.data);
  }

  findLiveScheduledMeeting(workspaceId: number) {
    return this.axios
      .get<LiveScheduledMeeting | null>(
        `/workspaces/${workspaceId}/meetings/live-scheduled`,
      )
      .then((res) => res.data);
  }
}
