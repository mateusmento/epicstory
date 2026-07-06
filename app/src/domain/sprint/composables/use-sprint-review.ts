import { destinationValue, statusBadgeClass, successPercent } from "@/lib/sprint";
import type { ISprint, ISprintItem } from "@epicstory/contracts";
import { computed, onMounted, type Ref, watch } from "vue";
import { useSprint } from "./sprint";

export function useSprintReview(sprintId: Ref<number>, teamId: Ref<number>) {
  const { sprints, sprintItems, fetchSprints, fetchSprintItems, updateSprintItemDestination } = useSprint();

  const sprint = computed<ISprint | undefined>(() => sprints.value.find((s) => s.id === sprintId.value));

  const items = computed<ISprintItem[]>(() => sprintItems.value.get(sprintId.value) ?? []);

  const incompleteItems = computed(() => items.value.filter((i) => i.completedStatus !== "done"));

  const completedItems = computed(() => items.value.filter((i) => i.completedStatus === "done"));

  const futureSprints = computed(() =>
    sprints.value.filter((s) => s.id !== sprintId.value && s.status !== "completed"),
  );

  const sprintSuccessPercent = computed(() => (sprint.value ? successPercent(sprint.value) : 0));

  const completedSprintsForChart = computed(() =>
    [...sprints.value]
      .filter((s) => s.status === "completed")
      .slice(-8)
      .reverse(),
  );

  const maxItemCount = computed(() => Math.max(...sprints.value.map((s) => s.itemCount), 1));

  async function load() {
    await Promise.all([fetchSprintItems(sprintId.value), fetchSprints(teamId.value)]);
  }

  onMounted(load);
  watch(sprintId, load);

  async function handleDestinationChange(item: ISprintItem, value: string) {
    const destSprintId = value === "backlog" ? null : +value;
    await updateSprintItemDestination(item.id, sprintId.value, destSprintId);
  }

  return {
    sprint,
    incompleteItems,
    completedItems,
    futureSprints,
    successPercent: sprintSuccessPercent,
    completedSprintsForChart,
    maxItemCount,
    handleDestinationChange,
    statusBadgeClass,
    destinationValue,
  };
}
