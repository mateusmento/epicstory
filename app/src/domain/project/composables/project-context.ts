import { useDependency } from "@/core/dependency-injection";
import { useRecentProjects } from "@/domain/workspace";
import { ProjectApi } from "@epicstory/api-client";
import type { Project } from "@epicstory/contracts";
import { defineStore } from "pinia";
import { computed, ref, type MaybeRefOrGetter, toValue } from "vue";

const useProjectContextStore = defineStore("project-context", () => {
  const byId = ref(new Map<number, Project>());

  function set(project: Project) {
    const next = new Map(byId.value);
    next.set(project.id, project);
    byId.value = next;
  }

  function get(projectId: number) {
    return byId.value.get(projectId);
  }

  return { byId, set, get };
});

const inFlightByProjectId = new Map<number, Promise<Project>>();

export function useProjectContext() {
  const store = useProjectContextStore();
  const projectApi = useDependency(ProjectApi);
  const { recentProjects } = useRecentProjects();

  async function ensureProjectContext(projectId: number) {
    const cached = store.get(projectId);
    if (cached) return cached;

    const fromRecent = recentProjects.value.find((project) => project.id === projectId);
    if (fromRecent) {
      store.set(fromRecent);
      return fromRecent;
    }

    const inFlight = inFlightByProjectId.get(projectId);
    if (inFlight) return inFlight;

    const promise = projectApi.findProject(projectId).then((project) => {
      store.set(project);
      inFlightByProjectId.delete(projectId);
      return project;
    });
    inFlightByProjectId.set(projectId, promise);
    return promise;
  }

  function projectFor(projectId: MaybeRefOrGetter<number>) {
    return computed(() => store.get(toValue(projectId)) ?? null);
  }

  return { ensureProjectContext, projectFor };
}
