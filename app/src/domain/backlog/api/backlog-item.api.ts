import { InjectAxios } from "@/core/axios";
import type { Page, PageQuery } from "@/core/types";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { BacklogItem } from "../types";

export type FindBacklogItemsQuery = PageQuery & {
  backlogId: number;
};

@injectable()
export class BacklogItemApi {
  constructor(@InjectAxios() private axios: Axios) {}

  findAll({ backlogId, ...query }: FindBacklogItemsQuery) {
    return this.axios
      .get<Page<BacklogItem>>(`/backlogs/${backlogId}/items`, { params: query })
      .then((res) => res.data);
  }

  create(backlogId: number, data: any) {
    return this.axios.post(`/backlogs/${backlogId}/items`, data).then((res) => res.data);
  }

  move(itemId: number, data: any) {
    return this.axios.put(`/backlog-items/${itemId}/order`, data).then((res) => res.data);
  }

  remove(itemId: number) {
    return this.axios.delete(`backlog-items/${itemId}`).then((res) => res.data);
  }
}
