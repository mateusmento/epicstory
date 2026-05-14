import type {
  CreateCalendarEventData,
  ICalendarEvent,
  ICalendarEventRecurrence,
} from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

@injectable()
export class CalendarEventApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  createCalendarEvent(data: CreateCalendarEventData) {
    return this.axios
      .post<ICalendarEvent>("/calendar-events", {
        ...data,
        startsAt: data.startsAt.toISOString(),
        endsAt: data.endsAt.toISOString(),
      })
      .then((r) => r.data);
  }

  findCalendarEvents(params: {
    workspaceId: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const query: Record<string, string | number> = {
      workspaceId: params.workspaceId,
    };
    if (params.startDate) query.startDate = params.startDate.toISOString();
    if (params.endDate) query.endDate = params.endDate.toISOString();
    return this.axios
      .get<ICalendarEvent[]>("/calendar-events", { params: query })
      .then((r) => r.data);
  }

  updateCalendarEvent(data: {
    id: string;
    type?: "event" | "meeting";
    title?: string;
    description?: string;
    payload?: Record<string, unknown>;
    startsAt?: Date;
    endsAt?: Date;
    isPublic?: boolean;
    notifyEnabled?: boolean;
    notifyMinutesBefore?: number;
    recurrence?: ICalendarEventRecurrence;
  }) {
    const body: Record<string, unknown> = {};
    if (data.type !== undefined) body.type = data.type;
    if (data.title !== undefined) body.title = data.title;
    if (data.description !== undefined) body.description = data.description;
    if (data.payload !== undefined) body.payload = data.payload;
    if (data.startsAt !== undefined)
      body.startsAt = data.startsAt.toISOString();
    if (data.endsAt !== undefined) body.endsAt = data.endsAt.toISOString();
    if (data.isPublic !== undefined) body.isPublic = data.isPublic;
    if (data.notifyEnabled !== undefined)
      body.notifyEnabled = data.notifyEnabled;
    if (data.notifyMinutesBefore !== undefined)
      body.notifyMinutesBefore = data.notifyMinutesBefore;
    if (data.recurrence !== undefined) body.recurrence = data.recurrence;
    return this.axios
      .patch<ICalendarEvent>(`/calendar-events/${data.id}`, body)
      .then((r) => r.data);
  }

  removeCalendarEvent(id: string) {
    return this.axios.delete(`/calendar-events/${id}`).then((r) => r.data);
  }

  getMeetingLobby(
    params:
      | { calendarEventId: string; occurrenceAt: Date }
      | { meetingId: number },
  ) {
    return this.axios
      .get(`/calendar-events/lobby`, { params })
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
