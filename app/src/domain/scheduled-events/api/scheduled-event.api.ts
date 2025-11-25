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
}
