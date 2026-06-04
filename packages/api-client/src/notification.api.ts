import type { Notification, Page, PageQuery } from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

@injectable()
export class NotificationApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  fetchNotifications(
    userId: number,
    opts?: Pick<PageQuery, "page" | "count">,
  ): Promise<Page<Notification>> {
    return this.axios
      .get<Page<Notification>>("/notifications", {
        params: {
          userId,
          page: opts?.page ?? 0,
          count: opts?.count ?? 30,
        },
      })
      .then((res) => res.data);
  }

  markAsSeen(notificationId: string) {
    return this.axios
      .put(`/notifications/${notificationId}/seen`)
      .then((res) => res.data);
  }
}
