import type {
  FindBacklogItemsQuery,
  IBacklogItem,
  IPage,
} from "@epicstory/contracts";
import type { AxiosInstance } from "axios";
import { Axios as AxiosImport } from "axios";
import { inject, injectable } from "tsyringe";
import {
  mapBacklogItem,
  mapPageBacklogItems,
  type IBacklogItemWire,
} from "./backlog.mapper";

export type { IBacklogItem } from "@epicstory/contracts";

@injectable()
export class BacklogApi {
  constructor(@inject(AxiosImport) protected readonly axios: AxiosInstance) {}

  findAll(query: FindBacklogItemsQuery): Promise<IPage<IBacklogItem>> {
    const { projectId, ...rest } = query;
    return this.axios
      .get<IPage<IBacklogItemWire>>(`/projects/${projectId}/backlog-items`, {
        params: { ...rest, filters: JSON.stringify(rest.filters) },
      })
      .then((res) => mapPageBacklogItems(res.data));
  }

  create(
    projectId: number,
    data: Record<string, unknown>,
  ): Promise<IBacklogItem> {
    return this.axios
      .post<IBacklogItemWire>(`/projects/${projectId}/backlog-items`, data)
      .then((res) => mapBacklogItem(res.data));
  }

  move(itemId: number, data: Record<string, unknown>): Promise<unknown> {
    return this.axios
      .put(`/backlog-items/${itemId}/order`, data)
      .then((res) => res.data);
  }

  remove(itemId: number): Promise<unknown> {
    return this.axios.delete(`backlog-items/${itemId}`).then((res) => res.data);
  }
}
