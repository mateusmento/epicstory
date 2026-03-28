import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";

export type ScheduledMeetingRecurrence =
  | { frequency: "once" }
  | { frequency: "daily"; interval: number; until?: string }
  | { frequency: "weekly"; interval: number; byWeekday: number[]; until?: string };

export type CreateScheduledMeetingData = {
  workspaceId: number;
  channelId?: number;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  isPublic?: boolean;
  notifyMinutesBefore?: number;
  recurrence: ScheduledMeetingRecurrence;
  participantIds?: number[];
};

export type ScheduledMeetingOccurrence = {
  id: string;
  startsAt: string;
  endsAt: string;
  meetingId?: number | null;
  scheduledMeeting: {
    id: string;
    title: string;
    description: string;
    channelId?: number | null;
    isPublic: boolean;
    notifyMinutesBefore: number;
  };
};

@injectable()
export class ScheduledMeetingApi {
  constructor(@InjectAxios() private axios: Axios) {}

  createScheduledMeeting(data: CreateScheduledMeetingData) {
    return this.axios
      .post("/scheduled-meetings", {
        ...data,
        startsAt: data.startsAt.toISOString(),
        endsAt: data.endsAt.toISOString(),
      })
      .then((res) => res.data);
  }

  findScheduledMeetings(params: { workspaceId: number; start?: Date; end?: Date }) {
    const query: any = { workspaceId: params.workspaceId };
    if (params.start) query.start = params.start.toISOString();
    if (params.end) query.end = params.end.toISOString();
    return this.axios
      .get<ScheduledMeetingOccurrence[]>("/scheduled-meetings", { params: query })
      .then((r) => r.data);
  }

  getOccurrence(occurrenceId: string) {
    return this.axios.get(`/scheduled-meetings/${occurrenceId}`).then((r) => r.data);
  }

  removeScheduledMeeting(scheduledMeetingId: string) {
    return this.axios.delete(`/scheduled-meetings/${scheduledMeetingId}`).then((r) => r.data);
  }
}
