import { useDependency } from "@/core/dependency-injection";
import { defineStore, storeToRefs } from "pinia";
import { debounce } from "lodash";
import type { Ref } from "vue";
import { ref } from "vue";
import { WorkspaceApi } from "@epicstory/api-client";
import type { WorkspaceMember } from "@epicstory/contracts";

const CHUNK = 20;

export const useWorkspaceMemberSearchStore = defineStore("workspaceMemberSearch", () => {
  const members = ref<WorkspaceMember[]>([]);
  const isSearching = ref(false);
  const isFetchingMore = ref(false);
  const hasMore = ref(true);
  const page = ref(0);
  const count = ref(CHUNK);
  const currentQ = ref("");

  return {
    members,
    isSearching,
    isFetchingMore,
    hasMore,
    page,
    count,
    currentQ,
  };
});

type WorkspaceMemberSearchRefs = {
  members: Ref<WorkspaceMember[]>;
  isSearching: Ref<boolean>;
  isFetchingMore: Ref<boolean>;
  hasMore: Ref<boolean>;
  page: Ref<number>;
  count: Ref<number>;
  currentQ: Ref<string>;
};

function createWorkspaceMemberSearchEngine(workspaceApi: WorkspaceApi, r: WorkspaceMemberSearchRefs) {
  const search = debounce(async (workspaceId: number, q: string) => {
    if (!workspaceId) {
      r.isSearching.value = false;
      return;
    }
    r.currentQ.value = q;
    r.page.value = 0;
    r.hasMore.value = true;
    r.isSearching.value = true;
    try {
      const result = await workspaceApi.findMembers(workspaceId, {
        page: 0,
        count: r.count.value,
        q: q.trim() || undefined,
      });
      r.members.value = result.content;
      r.hasMore.value = result.hasNext;
    } finally {
      r.isSearching.value = false;
    }
  }, 200);

  async function loadMore(workspaceId: number) {
    if (r.isFetchingMore.value) return;
    if (!r.hasMore.value) return;
    if (!workspaceId) return;

    r.isFetchingMore.value = true;
    try {
      const next = r.page.value + 1;
      const result = await workspaceApi.findMembers(workspaceId, {
        page: next,
        count: r.count.value,
        q: r.currentQ.value.trim() || undefined,
      });
      const existing = new Set(r.members.value.map((m) => m.id));
      for (const m of result.content) {
        if (!existing.has(m.id)) r.members.value.push(m);
      }
      r.page.value = next;
      r.hasMore.value = result.hasNext;
    } finally {
      r.isFetchingMore.value = false;
    }
  }

  return { search, loadMore };
}

/**
 * Global workspace member search (debounced `q`, chunked pages). Used by menus such as
 * {@link WorkspaceMemberMenu}. Do **not** use for TipTap @mentions — share the same Pinia store and
 * assignee pickers will overwrite results; use {@link useScopedWorkspaceMemberSearch} instead.
 */
export function useWorkspaceMemberSearch() {
  const store = useWorkspaceMemberSearchStore();
  const refs = storeToRefs(store);
  const workspaceApi = useDependency(WorkspaceApi);
  const { search, loadMore } = createWorkspaceMemberSearchEngine(workspaceApi, refs);

  return {
    members: refs.members,
    isSearching: refs.isSearching,
    isFetchingMore: refs.isFetchingMore,
    hasMore: refs.hasMore,
    search,
    loadMore,
  };
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
  const members = ref<WorkspaceMember[]>([]);
  const isSearching = ref(false);
  const isFetchingMore = ref(false);
  const hasMore = ref(true);
  const page = ref(0);
  const count = ref(options?.initialPageSize ?? CHUNK);
  const currentQ = ref("");
  const { search, loadMore } = createWorkspaceMemberSearchEngine(workspaceApi, {
    members,
    isSearching,
    isFetchingMore,
    hasMore,
    page,
    count,
    currentQ,
  });

  return {
    members,
    isSearching,
    isFetchingMore,
    hasMore,
    search,
    loadMore,
  };
}
