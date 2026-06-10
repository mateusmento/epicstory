import type { INotification, IPage, IPageQuery } from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";

@injectable()
export class NotificationApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  fetchNotifications(
    userId: number,
    opts?: Pick<IPageQuery, "page" | "count">,
  ): Promise<IPage<INotification>> {
    return this.axios
      .get<IPage<INotification>>("/notifications", {
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
