import { IssueApi } from "@epicstory/api-client";
import { TeamApi } from "@epicstory/api-client";
import { useDependency } from "@/core/dependency-injection";
import type { GanttDependency, GanttGroup, GanttItem, GanttZoom } from "@/design-system";
import type { TeamTimeline } from "@epicstory/contracts";
import { computed, ref, shallowRef } from "vue";

export function useTeamTimeline(teamId: number) {
  const teamApi = useDependency(TeamApi);
  const issueApi = useDependency(IssueApi);

  const timeline = shallowRef<TeamTimeline | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const zoom = ref<GanttZoom>("month");

  const groups = computed<GanttGroup[]>(() =>
    (timeline.value?.projects ?? []).map((project) => ({
      id: String(project.id),
      label: project.name,
    })),
  );

  const items = computed<GanttItem[]>(() =>
    (timeline.value?.epics ?? []).map((epic) => ({
      id: String(epic.id),
      groupId: String(epic.projectId),
      label: epic.title,
      startsAt: epic.startsAt,
      endsAt: epic.endsAt,
    })),
  );

  const dependencies = computed<GanttDependency[]>(() =>
    (timeline.value?.dependencies ?? []).map((dep) => ({
      id: String(dep.id),
      dependentItemId: String(dep.issueId),
      dependsOnItemId: String(dep.dependsOnIssueId),
    })),
  );

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      timeline.value = await teamApi.findTeamTimeline(teamId);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load timeline";
    } finally {
      loading.value = false;
    }
  }

  function patchEpicSchedule(itemId: string, startsAt: string, endsAt: string) {
    if (!timeline.value) return;
    const id = Number(itemId);
    timeline.value = {
      ...timeline.value,
      epics: timeline.value.epics.map((epic) => (epic.id === id ? { ...epic, startsAt, endsAt } : epic)),
    };
  }

  async function onUpdateSchedule(payload: { itemId: string; startsAt: string; endsAt: string }) {
    patchEpicSchedule(payload.itemId, payload.startsAt, payload.endsAt);
    try {
      await issueApi.updateIssueSchedule(Number(payload.itemId), {
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
      });
    } catch (e) {
      await load();
      throw e;
    }
  }

  async function onCreateDependency(payload: { dependentItemId: string; dependsOnItemId: string }) {
    const created = await issueApi.createIssueDependency(Number(payload.dependentItemId), {
      dependsOnIssueId: Number(payload.dependsOnItemId),
    });
    if (!timeline.value) return;
    timeline.value = {
      ...timeline.value,
      dependencies: [...timeline.value.dependencies, created],
    };
  }

  async function onRemoveDependency(dependencyId: string) {
    const dep = timeline.value?.dependencies.find((d) => String(d.id) === dependencyId);
    if (!dep) return;
    timeline.value = {
      ...timeline.value!,
      dependencies: timeline.value!.dependencies.filter((d) => String(d.id) !== dependencyId),
    };
    try {
      await issueApi.removeIssueDependency(dep.issueId, dep.id);
    } catch (e) {
      await load();
      throw e;
    }
  }

  return {
    timeline,
    loading,
    error,
    zoom,
    groups,
    items,
    dependencies,
    load,
    onUpdateSchedule,
    onCreateDependency,
    onRemoveDependency,
  };
}
