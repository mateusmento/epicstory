import { useDependency } from "@/core/dependency-injection";
import { createPaginatedListEngine, createPaginatedListState } from "@/domain/async";
import { githubApiErrorMessage } from "@/domain/github/github-api-errors";
import { GithubIntegrationApi } from "@epicstory/api-client";
import type { IGithubCatalogRepository } from "@epicstory/contracts";
import { toReactive } from "@vueuse/core";
import { markRaw, ref, toRefs } from "vue";

const DEFAULT_PAGE_SIZE = 30;

export type UseGithubRepositoryCatalogOptions = {
  pageSize?: number;
};

/**
 * Forward-paginated GitHub App repository catalogue for a workspace.
 * Used by issue repo picker and workspace GitHub integration settings.
 */
export function useGithubRepositoryCatalog(options: UseGithubRepositoryCatalogOptions = {}) {
  const githubApi = useDependency(GithubIntegrationApi);

  const state = createPaginatedListState<IGithubCatalogRepository>({
    pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
  });
  const totalCount = ref(0);
  const hasLoaded = ref(false);

  const { reload, loadMore: engineLoadMore } = createPaginatedListEngine({
    state,
    searchDebounceMs: 0,
    isContextReady: (workspaceId: number) => !!workspaceId,
    getItemId: (repo) => repo.githubRepoId,
    fetchPage: async (workspaceId, _q, pageIndex, size) => {
      const page = await githubApi.listRepositories(workspaceId, {
        page: pageIndex,
        count: size,
      });
      totalCount.value = page.total;
      return page;
    },
  });

  async function load(workspaceId: number, fallback = "Could not load repositories from GitHub.") {
    try {
      await reload(workspaceId, "");
      hasLoaded.value = true;
    } catch (e: unknown) {
      state.items = [];
      state.hasMore = false;
      state.error = githubApiErrorMessage(e, fallback);
      totalCount.value = 0;
      hasLoaded.value = true;
    }
  }

  async function loadMore(workspaceId: number, fallback = "Could not load more repositories.") {
    if (state.loadingMore || !state.hasMore) return;
    try {
      await engineLoadMore(workspaceId);
    } catch (e: unknown) {
      state.error = githubApiErrorMessage(e, fallback);
    }
  }

  function reset() {
    state.items = [];
    state.loading = false;
    state.loadingMore = false;
    state.hasMore = false;
    state.error = null;
    state.page = 0;
    state.query = "";
    totalCount.value = 0;
    hasLoaded.value = false;
  }

  return toReactive({
    ...toRefs(state),
    hasLoaded,
    totalCount,
    load: markRaw(load),
    loadMore: markRaw(loadMore),
    reset: markRaw(reset),
  });
}
