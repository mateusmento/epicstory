import { useDependency } from "@/core/dependency-injection";
import { ProjectApi, WorkspaceApi } from "@epicstory/api-client";
import type { Project } from "@epicstory/contracts";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";

const RECENT_LIMIT = 5;

const useRecentProjectsStore = defineStore("recent-projects", () => {
  const recentProjects = ref<Project[]>([]);
  return { recentProjects };
});

export function useRecentProjects() {
  const store = useRecentProjectsStore();
  const workspaceApi = useDependency(WorkspaceApi);
  const projectApi = useDependency(ProjectApi);

  async function fetchRecentProjects(workspaceId: number, count = RECENT_LIMIT) {
    store.recentProjects = await workspaceApi.findRecentProjects(workspaceId, { count });
  }

  async function recordProjectAccess(projectId: number, workspaceId: number) {
    // Optimistic reorder: instantly move the project to the front if already known
    const existing = store.recentProjects.find((p) => p.id === projectId);
    if (existing) {
      store.recentProjects = [existing, ...store.recentProjects.filter((p) => p.id !== projectId)].slice(
        0,
        RECENT_LIMIT,
      );
    }

    projectApi
      .recordAccess(projectId)
      .then(() => fetchRecentProjects(workspaceId))
      .catch(() => {});
  }

  return { ...storeToRefs(store), fetchRecentProjects, recordProjectAccess };
}
