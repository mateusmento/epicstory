import { useDependency } from "@/core/dependency-injection";
import { SprintApi } from "@epicstory/api-client";
import type { CompleteSprintResult, ISprint, ISprintItem } from "@epicstory/contracts";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";

const useSprintStore = defineStore("sprint", () => {
  const sprints = ref<ISprint[]>([]);
  const sprintItems = ref<Map<number, ISprintItem[]>>(new Map());
  return { sprints, sprintItems };
});

export function useSprint() {
  const store = useSprintStore();
  const sprintApi = useDependency(SprintApi);

  async function fetchSprints(teamId: number, status?: ISprint["status"]) {
    store.sprints = await sprintApi.findSprints(teamId, status ? { status } : undefined);
    return store.sprints;
  }

  async function fetchSprintItems(sprintId: number) {
    const items = await sprintApi.findSprintItems(sprintId);
    store.sprintItems.set(sprintId, items);
    return items;
  }

  async function createSprint(teamId: number): Promise<ISprint> {
    const sprint = await sprintApi.createSprint(teamId);
    store.sprints = [sprint, ...store.sprints];
    return sprint;
  }

  async function startSprint(sprintId: number): Promise<ISprint> {
    const updated = await sprintApi.startSprint(sprintId);
    store.sprints = store.sprints.map((s) => (s.id === sprintId ? updated : s));
    return updated;
  }

  async function completeSprint(sprintId: number): Promise<CompleteSprintResult> {
    const result = await sprintApi.completeSprint(sprintId);
    store.sprints = store.sprints.map((s) => (s.id === sprintId ? result.sprint : s));
    store.sprintItems.set(sprintId, result.items);
    return result;
  }

  async function addSprintItem(
    sprintId: number,
    issueId: number,
    issue?: ISprintItem["issue"],
  ): Promise<ISprintItem> {
    const apiItem = await sprintApi.addSprintItem(sprintId, issueId);
    const item = apiItem.issue ? apiItem : issue ? { ...apiItem, issue } : apiItem;
    const current = store.sprintItems.get(sprintId) ?? [];
    store.sprintItems.set(sprintId, [...current, item]);
    return item;
  }

  async function removeSprintItem(itemId: number, sprintId: number): Promise<void> {
    await sprintApi.removeSprintItem(itemId);
    const current = store.sprintItems.get(sprintId) ?? [];
    store.sprintItems.set(
      sprintId,
      current.filter((i) => i.id !== itemId),
    );
  }

  async function reorderSprintItem(
    itemId: number,
    sprintId: number,
    afterOf: number | null,
  ): Promise<ISprintItem> {
    const updated = await sprintApi.reorderSprintItem(itemId, afterOf);
    const current = store.sprintItems.get(sprintId) ?? [];
    store.sprintItems.set(
      sprintId,
      current.map((i) => (i.id === itemId ? { ...i, order: updated.order } : i)),
    );
    return updated;
  }

  async function updateSprintItemDestination(
    itemId: number,
    sprintId: number,
    destinationSprintId: number | null,
  ): Promise<ISprintItem> {
    const updated = await sprintApi.updateSprintItemDestination(itemId, destinationSprintId);
    const current = store.sprintItems.get(sprintId) ?? [];
    store.sprintItems.set(
      sprintId,
      current.map((i) => (i.id === itemId ? { ...i, destinationSprintId } : i)),
    );
    return updated;
  }

  return {
    ...storeToRefs(store),
    fetchSprints,
    fetchSprintItems,
    createSprint,
    startSprint,
    completeSprint,
    addSprintItem,
    removeSprintItem,
    reorderSprintItem,
    updateSprintItemDestination,
  };
}
