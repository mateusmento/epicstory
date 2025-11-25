import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";

export type Notification = {
  id: string;
  type: string;
  userId: number;
  payload: {
    title: string;
    description?: string;
  };
  createdAt: string;
  seen: boolean;
};

@injectable()
export class NotificationApi {
  constructor(@InjectAxios() private axios: Axios) {}

  fetchNotifications(userId: number, limit?: number) {
    return this.axios
      .get<Notification[]>("/notifications", {
        params: { userId, limit },
      })
      .then((res) => res.data);
  }

  markAsSeen(notificationId: string) {
    return this.axios.post(`/notifications/${notificationId}/seen`).then((res) => res.data);
  }
}
