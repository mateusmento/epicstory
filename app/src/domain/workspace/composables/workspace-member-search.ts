import { useDependency } from "@/core/dependency-injection";
import { createPaginatedListEngine, createPaginatedListState, type PaginatedListState } from "@/domain/async";
import { WorkspaceApi } from "@epicstory/api-client";
import type { WorkspaceMember } from "@epicstory/contracts";
import { toReactive } from "@vueuse/core";
import { markRaw, toRefs } from "vue";

const CHUNK = 20;

function createWorkspaceMemberSearchEngine(
  workspaceApi: WorkspaceApi,
  state: PaginatedListState<WorkspaceMember>,
) {
  return createPaginatedListEngine({
    state,
    searchDebounceMs: 200,
    isContextReady: (workspaceId: number) => !!workspaceId,
    getItemId: (member) => member.id,
    fetchPage: (workspaceId, q, page, pageSize) =>
      workspaceApi.findMembers(workspaceId, {
        page,
        count: pageSize,
        q: q.trim() || undefined,
      }),
  });
}

const workspaceMemberSearchState = createPaginatedListState<WorkspaceMember>({
  pageSize: CHUNK,
  hasMore: true,
});

/**
 * Global workspace member search (debounced `q`, chunked pages). Used by menus such as
 * {@link WorkspaceMemberMenu}. Do **not** use for TipTap @mentions — share the same Pinia store and
 * assignee pickers will overwrite results; use {@link useScopedWorkspaceMemberSearch} instead.
 */
export function useWorkspaceMemberSearch() {
  const state = workspaceMemberSearchState;
  const workspaceApi = useDependency(WorkspaceApi);
  const { search, loadMore } = createWorkspaceMemberSearchEngine(workspaceApi, state);

  return toReactive({
    ...toRefs(state),
    search: markRaw(search),
    loadMore: markRaw(loadMore),
  });
}

/**
 * Isolated member search state for callers that must not touch the global menu store (e.g. issue
 * @mentions while {@link useWorkspaceMemberSearch} powers assignee dropdowns).
 *
 * `initialPageSize` defaults to the same chunk as menus (20). Pass a larger size when the consumer
 * keeps a static roster (e.g. TipTap mentions filter client-side only).
 */
export function useScopedWorkspaceMemberSearch(options?: { initialPageSize?: number }) {
  const workspaceApi = useDependency(WorkspaceApi);
  const state = createPaginatedListState<WorkspaceMember>({
    pageSize: options?.initialPageSize ?? CHUNK,
    hasMore: true,
  });
  const { search, loadMore } = createWorkspaceMemberSearchEngine(workspaceApi, state);

  return toReactive({
    ...toRefs(state),
    search: markRaw(search),
    loadMore: markRaw(loadMore),
  });
}
