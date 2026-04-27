import { useDependency } from "@/core/dependency-injection";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { debounce } from "lodash";
import { WorkspaceApi } from "../services";
import type { WorkspaceMember } from "../types";

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

export function useWorkspaceMemberSearch() {
  const store = useWorkspaceMemberSearchStore();
  const { members, isSearching, isFetchingMore, hasMore } = storeToRefs(store);
  const workspaceApi = useDependency(WorkspaceApi);

  const search = debounce(async (workspaceId: number, q: string) => {
    if (!workspaceId) {
      store.isSearching = false;
      return;
    }
    store.currentQ = q;
    store.page = 0;
    store.hasMore = true;
    store.isSearching = true;
    try {
      const result = await workspaceApi.findMembers(workspaceId, {
        page: 0,
        count: store.count,
        q: q.trim() || undefined,
      });
      store.members = result.content;
      store.hasMore = result.hasNext;
    } finally {
      store.isSearching = false;
    }
  }, 200);

  async function loadMore(workspaceId: number) {
    if (store.isFetchingMore) return;
    if (!store.hasMore) return;
    if (!workspaceId) return;

    store.isFetchingMore = true;
    try {
      const next = store.page + 1;
      const result = await workspaceApi.findMembers(workspaceId, {
        page: next,
        count: store.count,
        q: store.currentQ.trim() || undefined,
      });
      const existing = new Set(store.members.map((m) => m.id));
      for (const m of result.content) {
        if (!existing.has(m.id)) store.members.push(m);
      }
      store.page = next;
      store.hasMore = result.hasNext;
    } finally {
      store.isFetchingMore = false;
    }
  }

  return {
    members,
    isSearching,
    isFetchingMore,
    hasMore,
    search,
    loadMore,
  };
}
