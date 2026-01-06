import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";

export type ScheduledEvent = {
  id: string;
  userId: number;
  payload: any;
  dueAt: string;
  processed: boolean;
  lockId: string;
};

export type CreateScheduledEventData = {
  userId: number;
  payload: any;
  dueAt: Date;
};

@injectable()
export class ScheduledEventApi {
  constructor(@InjectAxios() private axios: Axios) {}

  createScheduledEvent(data: CreateScheduledEventData) {
    return this.axios
      .post<ScheduledEvent>("/scheduled-events", {
        userId: data.userId,
        payload: data.payload,
        dueAt: data.dueAt.toISOString(),
      })
      .then((res) => res.data);
  }

  getScheduledEvents(params: { userId: number; startDate?: Date; endDate?: Date }) {
    const queryParams: any = { userId: params.userId };
    if (params.startDate) {
      queryParams.startDate = params.startDate.toISOString();
    }
    if (params.endDate) {
      queryParams.endDate = params.endDate.toISOString();
    }
    return this.axios
      .get<ScheduledEvent[]>("/scheduled-events", { params: queryParams })
      .then((res) => res.data);
  }

  updateScheduledEvent(data: { id: string; userId: number; payload?: any; dueAt?: Date }) {
    const body: any = { userId: data.userId };
    if (data.payload !== undefined) {
      body.payload = data.payload;
    }
    if (data.dueAt !== undefined) {
      body.dueAt = data.dueAt.toISOString();
    }
    return this.axios.patch<ScheduledEvent>(`/scheduled-events/${data.id}`, body).then((res) => res.data);
  }
}
