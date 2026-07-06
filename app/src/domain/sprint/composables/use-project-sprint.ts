import { useDependency } from "@/core/dependency-injection";
import { ProjectApi } from "@epicstory/api-client";
import type { ISprintItem } from "@epicstory/contracts";
import { computed, onMounted, ref } from "vue";
import { useSprint } from "./sprint";

export type ProjectSprintProps = { workspaceId: string; projectId: string };

export function useProjectSprint(props: ProjectSprintProps) {
  const projectApi = useDependency(ProjectApi);
  const { sprints, sprintItems, fetchSprints, fetchSprintItems } = useSprint();

  const teamId = ref<number | null>(null);
  const loading = ref(true);

  const activeSprint = computed(() => sprints.value.find((s) => s.status === "active") ?? null);

  const activeSprintItems = computed<ISprintItem[]>(() => {
    if (!activeSprint.value) return [];
    return (sprintItems.value.get(activeSprint.value.id) ?? []).filter(
      (i) => i.issue?.projectId === +props.projectId,
    );
  });

  const todoItems = computed(() =>
    activeSprintItems.value.filter((i) => !["doing", "done"].includes(i.issue?.status ?? "")),
  );

  const doingItems = computed(() => activeSprintItems.value.filter((i) => i.issue?.status === "doing"));

  const doneItems = computed(() => activeSprintItems.value.filter((i) => i.issue?.status === "done"));

  onMounted(async () => {
    const project = await projectApi.findProject(+props.projectId);
    teamId.value = project.teamId ?? null;

    if (teamId.value) {
      await fetchSprints(teamId.value);
      const active = sprints.value.find((s) => s.status === "active");
      if (active) await fetchSprintItems(active.id);
    }
    loading.value = false;
  });

  return { teamId, loading, activeSprint, activeSprintItems, todoItems, doingItems, doneItems };
}
