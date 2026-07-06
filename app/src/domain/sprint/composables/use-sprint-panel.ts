import type { IDnDPayload } from "@vue-dnd-kit/core";
import type { ISprint, ISprintItem } from "@epicstory/contracts";
import { computed, onMounted, ref, type Ref } from "vue";
import { useSprint } from "./sprint";

export type SprintPanelProps = { teamId: number };

export function useSprintPanel(props: SprintPanelProps) {
  const {
    sprints,
    sprintItems,
    fetchSprints,
    fetchSprintItems,
    addSprintItem,
    removeSprintItem,
    reorderSprintItem,
  } = useSprint();

  // Local reactive arrays per sprint — DnD mutates these in-place via splice
  const localSprintItemsMap = new Map<number, Ref<ISprintItem[]>>();

  function getLocalItemsRef(sprintId: number): Ref<ISprintItem[]> {
    if (!localSprintItemsMap.has(sprintId)) {
      localSprintItemsMap.set(sprintId, ref([]));
    }
    return localSprintItemsMap.get(sprintId)!;
  }

  function getLocalItems(sprintId: number): ISprintItem[] {
    return getLocalItemsRef(sprintId).value;
  }

  async function loadSprintItems(sprintId: number) {
    const items = await fetchSprintItems(sprintId);
    getLocalItemsRef(sprintId).value = [...items];
  }

  const currentSprint = computed<ISprint | null>(
    () => sprints.value.find((s) => s.status === "active") ?? null,
  );

  const upcomingSprint = computed<ISprint | null>(
    () => sprints.value.find((s) => s.status === "planned") ?? null,
  );

  const completedSprints = computed<ISprint[]>(() => sprints.value.filter((s) => s.status === "completed"));

  async function handleAddToSprint(sprintId: number, issueId: number, issue?: ISprintItem["issue"]) {
    const newItem = await addSprintItem(sprintId, issueId, issue);
    getLocalItemsRef(sprintId).value = [...getLocalItemsRef(sprintId).value, newItem];
  }

  async function handleRemoveFromSprint(sprintId: number, item: ISprintItem) {
    getLocalItemsRef(sprintId).value = getLocalItemsRef(sprintId).value.filter((i) => i.id !== item.id);
    await removeSprintItem(item.id, sprintId);
  }

  async function handleSprintDrop(targetSprintId: number, payload: IDnDPayload) {
    const activeId = payload.items[0]?.id;
    if (activeId === undefined || activeId === null) return;

    // Backlog item (id prefixed "b-") dropped into a sprint zone
    if (typeof activeId === "string" && activeId.startsWith("b-")) {
      const backlogItemId = +activeId.slice(2);
      const itemData = payload.items[0] as any;
      const issue = itemData?.data?.issue ?? undefined;
      const issueId = itemData?.data?.issueId ?? backlogItemId;
      const newItem = await addSprintItem(targetSprintId, issueId, issue);
      getLocalItemsRef(targetSprintId).value = [...getLocalItemsRef(targetSprintId).value, newItem];
      return;
    }

    // Sprint item — find source sprint
    const sprintItemId = activeId as number;
    let sourceSprintId: number | null = null;
    for (const [sid] of localSprintItemsMap.entries()) {
      if (getLocalItemsRef(sid).value.some((i) => i.id === sprintItemId)) {
        sourceSprintId = sid;
        break;
      }
    }
    if (sourceSprintId === null) return;

    if (sourceSprintId === targetSprintId) {
      // Within-sprint reorder: hover already mutated the local array; persist order
      const localItems = getLocalItemsRef(targetSprintId).value;
      const droppedIndex = localItems.findIndex((i) => i.id === sprintItemId);
      const afterOf = droppedIndex > 0 ? localItems[droppedIndex - 1].id : null;
      await reorderSprintItem(sprintItemId, targetSprintId, afterOf);
    } else {
      // Cross-sprint move
      const sprintItem = getLocalItemsRef(sourceSprintId).value.find((i) => i.id === sprintItemId);
      if (!sprintItem) return;
      getLocalItemsRef(sourceSprintId).value = getLocalItemsRef(sourceSprintId).value.filter(
        (i) => i.id !== sprintItemId,
      );
      await removeSprintItem(sprintItemId, sourceSprintId);
      const newItem = await addSprintItem(targetSprintId, sprintItem.issue.id);
      getLocalItemsRef(targetSprintId).value = [...getLocalItemsRef(targetSprintId).value, newItem];
    }
  }

  onMounted(async () => {
    await fetchSprints(props.teamId);
    const current = sprints.value.find((s) => s.status === "active");
    const upcoming = sprints.value.find((s) => s.status === "planned");
    const loads: Promise<void>[] = [];
    if (current) loads.push(loadSprintItems(current.id));
    if (upcoming) loads.push(loadSprintItems(upcoming.id));
    await Promise.all(loads);
  });

  function onSprintAction() {
    fetchSprints(props.teamId);
  }

  return {
    sprints,
    sprintItems,
    currentSprint,
    upcomingSprint,
    completedSprints,
    getLocalItems,
    handleAddToSprint,
    handleRemoveFromSprint,
    handleSprintDrop,
    onSprintAction,
    loadSprintItems,
  };
}
