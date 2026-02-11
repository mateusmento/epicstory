import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { Notification } from "../types/notification.types";
import type { Page } from "@/core/types";

@injectable()
export class NotificationApi {
  constructor(@InjectAxios() private axios: Axios) {}

  fetchNotifications(userId: number, limit?: number): Promise<Page<Notification>> {
    return this.axios
      .get<Page<Notification>>("/notifications", {
        params: { userId, limit },
      })
      .then((res) => res.data);
  }

  markAsSeen(notificationId: string) {
    return this.axios.put(`/notifications/${notificationId}/seen`).then((res) => res.data);
  }
}
