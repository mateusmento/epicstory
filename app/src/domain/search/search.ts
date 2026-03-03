import { useDependency } from "@/core/dependency-injection";
import { SearchApi } from "./search.api";
import type { SearchQuery } from "./types";

export function useSearch() {
  const searchApi = useDependency(SearchApi);

  async function search(workspaceId: number, query: SearchQuery) {
    const result = await searchApi.search(workspaceId, query);
    return result;
  }

  return { search };
}
