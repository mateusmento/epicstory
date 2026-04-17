import { InjectAxios } from "@/core/axios";
import { issueFromApiResponse, type IssueWire } from "@/domain/issues/api/issue.api";
import type { Page, PageQuery } from "@/core/types";
import type { Axios } from "axios";
import { injectable } from "tsyringe";
import type { BacklogItem } from "../types";

type BacklogItemWire = Omit<BacklogItem, "issue"> & { issue: IssueWire };

function mapBacklogItem(item: BacklogItemWire): BacklogItem {
  return { ...item, issue: issueFromApiResponse(item.issue) };
}

export interface BacklogItemFieldFilter {
  field: string;
  operator: string;
  value: unknown;
}

export type FindBacklogItemsQuery = PageQuery & {
  projectId: number;
  filters?: BacklogItemFieldFilter[];
};

@injectable()
export class BacklogItemApi {
  constructor(@InjectAxios() private axios: Axios) {}

  findAll({ projectId, ...query }: FindBacklogItemsQuery) {
    return this.axios
      .get<Page<BacklogItemWire>>(`/projects/${projectId}/backlog-items`, {
        params: { ...query, filters: JSON.stringify(query.filters) },
      })
      .then((res) => ({
        ...res.data,
        content: res.data.content.map(mapBacklogItem),
      }));
  }

  create(projectId: number, data: any) {
    return this.axios
      .post<BacklogItemWire>(`/projects/${projectId}/backlog-items`, data)
      .then((res) => mapBacklogItem(res.data));
  }

  move(itemId: number, data: any) {
    return this.axios.put(`/backlog-items/${itemId}/order`, data).then((res) => res.data);
  }

  remove(itemId: number) {
    return this.axios.delete(`backlog-items/${itemId}`).then((res) => res.data);
  }
}
