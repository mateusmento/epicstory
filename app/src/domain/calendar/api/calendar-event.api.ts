import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";

export type CalendarEventRecurrence =
  | { frequency: "once"; until?: string }
  | { frequency: "daily"; interval?: number; until?: string }
  | { frequency: "weekly"; interval?: number; byWeekday?: number[]; until?: string };

export type CalendarEventDto = {
  id: string;
  occurrenceId: string;
  workspaceId: number;
  createdById: number;
  type: "event" | "meeting";
  startsAt: string;
  endsAt: string;
  title: string;
  description: string;
  isPublic: boolean;
  notifyEnabled: boolean;
  notifyMinutesBefore: number;
  recurrence: CalendarEventRecurrence;
  payload: Record<string, any>;
};

export type CreateCalendarEventData = {
  workspaceId: number;
  type: "event" | "meeting";
  title: string;
  description?: string;
  payload?: Record<string, any>;
  startsAt: Date;
  endsAt: Date;
  channelId?: number | null;
  isPublic?: boolean;
  notifyEnabled?: boolean;
  notifyMinutesBefore?: number;
  recurrence?: CalendarEventRecurrence;
  participantIds?: number[];
};

@injectable()
export class CalendarEventApi {
  constructor(@InjectAxios() private axios: Axios) {}

  createCalendarEvent(data: CreateCalendarEventData) {
    return this.axios
      .post<CalendarEventDto>("/calendar-events", {
        ...data,
        startsAt: data.startsAt.toISOString(),
        endsAt: data.endsAt.toISOString(),
      })
      .then((r) => r.data);
  }

  findCalendarEvents(params: { workspaceId: number; startDate?: Date; endDate?: Date }) {
    const query: any = { workspaceId: params.workspaceId };
    if (params.startDate) query.startDate = params.startDate.toISOString();
    if (params.endDate) query.endDate = params.endDate.toISOString();
    return this.axios.get<CalendarEventDto[]>("/calendar-events", { params: query }).then((r) => r.data);
  }

  updateCalendarEvent(data: {
    id: string;
    type?: "event" | "meeting";
    title?: string;
    description?: string;
    payload?: Record<string, any>;
    startsAt?: Date;
    endsAt?: Date;
    isPublic?: boolean;
    notifyEnabled?: boolean;
    notifyMinutesBefore?: number;
    recurrence?: CalendarEventRecurrence;
  }) {
    const body: any = {};
    if (data.type !== undefined) body.type = data.type;
    if (data.title !== undefined) body.title = data.title;
    if (data.description !== undefined) body.description = data.description;
    if (data.payload !== undefined) body.payload = data.payload;
    if (data.startsAt !== undefined) body.startsAt = data.startsAt.toISOString();
    if (data.endsAt !== undefined) body.endsAt = data.endsAt.toISOString();
    if (data.isPublic !== undefined) body.isPublic = data.isPublic;
    if (data.notifyEnabled !== undefined) body.notifyEnabled = data.notifyEnabled;
    if (data.notifyMinutesBefore !== undefined) body.notifyMinutesBefore = data.notifyMinutesBefore;
    if (data.recurrence !== undefined) body.recurrence = data.recurrence;
    return this.axios.patch<CalendarEventDto>(`/calendar-events/${data.id}`, body).then((r) => r.data);
  }

  removeCalendarEvent(id: string) {
    return this.axios.delete(`/calendar-events/${id}`).then((r) => r.data);
  }

  getMeetingLobby(calendarEventId: string, occurrenceAt: Date) {
    return this.axios
      .get(`/calendar-events/${calendarEventId}/lobby`, {
        params: { occurrenceAt: occurrenceAt.toISOString() },
      })
      .then((r) => r.data);
  }

  ensureMeetingSession(calendarEventId: string, occurrenceAt: Date) {
    return this.axios
      .post(`/calendar-events/${calendarEventId}/ensure-session`, {
        occurrenceAt: occurrenceAt.toISOString(),
      })
      .then((r) => r.data);
  }
}
