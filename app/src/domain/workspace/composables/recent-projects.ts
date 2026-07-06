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

  async function recordProjectAccess(projectId: number) {
    projectApi.recordAccess(projectId).catch(() => {});
  }

  return { ...storeToRefs(store), fetchRecentProjects, recordProjectAccess };
}
