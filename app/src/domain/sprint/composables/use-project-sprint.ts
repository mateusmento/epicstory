import { useProjectContext } from "@/domain/project";
import { useSprint } from "@/domain/sprint";
import type { ISprintItem } from "@epicstory/contracts";
import { computed, onMounted, ref } from "vue";

export type ProjectSprintProps = { workspaceId: string; projectId: string };

export function useProjectSprint(props: ProjectSprintProps) {
  const { ensureProjectContext } = useProjectContext();
  const { sprints, sprintItems, fetchSprints, fetchSprintItems } = useSprint();

  const teamId = ref<number>(0);
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
    const project = await ensureProjectContext(+props.projectId);
    teamId.value = project.teamId;

    await fetchSprints(teamId.value);
    const active = sprints.value.find((s) => s.status === "active");
    if (active) await fetchSprintItems(active.id);
    loading.value = false;
  });

  return { teamId, loading, activeSprint, activeSprintItems, todoItems, doingItems, doneItems };
}
