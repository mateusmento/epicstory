import { InjectAxios } from "@/core/axios";
import type { Axios } from "axios";
import type { SearchQuery, SearchResult } from "./types";
import { injectable } from "tsyringe";

@injectable()
export class SearchApi {
  constructor(@InjectAxios() private axios: Axios) {}

  search(workspaceId: number, query: SearchQuery) {
    return this.axios
      .post<SearchResult[]>(`/workspaces/${workspaceId}/search`, query)
      .then((res) => res.data);
  }
}
