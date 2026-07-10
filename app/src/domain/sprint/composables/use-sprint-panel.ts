import type { IDnDPayload } from "@vue-dnd-kit/core";
import type { ISprint, ISprintItem } from "@epicstory/contracts";
import { computed, onMounted, ref, watch, type Ref } from "vue";
import { useSprint } from "./sprint";

export type SprintPanelProps = { teamId: number };

/** Mutate in place so vue-dnd-kit's captured `data.source` array reference stays valid. */
function replaceListContents(target: ISprintItem[], next: ISprintItem[]) {
  target.splice(0, target.length, ...next);
}

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

  function syncLocalFromStore(sprintId: number) {
    const fromStore = sprintItems.value.get(sprintId);
    if (!fromStore) return;
    replaceListContents(getLocalItemsRef(sprintId).value, fromStore);
  }

  async function loadSprintItems(sprintId: number) {
    const items = await fetchSprintItems(sprintId);
    replaceListContents(getLocalItemsRef(sprintId).value, items);
  }

  const currentSprint = computed<ISprint | null>(
    () => sprints.value.find((s) => s.status === "active") ?? null,
  );

  const upcomingSprint = computed<ISprint | null>(
    () => sprints.value.find((s) => s.status === "planned") ?? null,
  );

  const completedSprints = computed<ISprint[]>(() => sprints.value.filter((s) => s.status === "completed"));

  // Keep panel lists in sync when items are removed/added elsewhere (backlog dropzone / context menu).
  // Never replace the array reference — DnD owns that identity until drop persists.
  watch(
    sprintItems,
    () => {
      for (const [sprintId, localRef] of localSprintItemsMap.entries()) {
        const fromStore = sprintItems.value.get(sprintId);
        if (!fromStore) continue;
        const storeIds = new Set(fromStore.map((item) => item.id));
        const local = localRef.value;

        for (let i = local.length - 1; i >= 0; i--) {
          if (!storeIds.has(local[i].id)) {
            local.splice(i, 1);
          }
        }

        const localIds = new Set(local.map((item) => item.id));
        for (const item of fromStore) {
          if (!localIds.has(item.id)) {
            local.push(item);
          }
        }
      }
    },
    { deep: true },
  );

  async function handleAddToSprint(sprintId: number, issueId: number, issue?: ISprintItem["issue"]) {
    await addSprintItem(sprintId, issueId, issue);
    // Store update → watch appends in place
  }

  async function handleRemoveFromSprint(sprintId: number, item: ISprintItem) {
    const local = getLocalItemsRef(sprintId).value;
    const index = local.findIndex((i) => i.id === item.id);
    if (index >= 0) local.splice(index, 1);
    await removeSprintItem(item.id, sprintId);
  }

  function resolveSourceSprintId(sprintItemId: number, payloadItem: { data?: Record<string, unknown> }) {
    const fromData = payloadItem?.data?.sprintId;
    if (typeof fromData === "number" && getLocalItemsRef(fromData).value.some((i) => i.id === sprintItemId)) {
      return fromData;
    }
    for (const [sid] of localSprintItemsMap.entries()) {
      if (getLocalItemsRef(sid).value.some((i) => i.id === sprintItemId)) {
        return sid;
      }
    }
    return null;
  }

  async function handleSprintDrop(targetSprintId: number, payload: IDnDPayload) {
    const active = payload.items[0];
    const activeId = active?.id;
    if (activeId === undefined || activeId === null) return;

    // Backlog item (id prefixed "b-") dropped into a sprint zone
    if (typeof activeId === "string" && activeId.startsWith("b-")) {
      const backlogItemId = +activeId.slice(2);
      const itemData = active as { data?: { issue?: ISprintItem["issue"]; issueId?: number } };
      const issue = itemData?.data?.issue ?? undefined;
      const issueId = itemData?.data?.issueId ?? backlogItemId;
      await addSprintItem(targetSprintId, issueId, issue);
      // Store update → watch appends in place
      return;
    }

    const sprintItemId = activeId as number;
    const sourceSprintId = resolveSourceSprintId(sprintItemId, active as { data?: Record<string, unknown> });
    if (sourceSprintId === null) return;

    if (sourceSprintId === targetSprintId) {
      const localItems = getLocalItemsRef(targetSprintId).value;
      const droppedIndex = localItems.findIndex((i) => i.id === sprintItemId);
      const afterOf = droppedIndex > 0 ? localItems[droppedIndex - 1].id : null;
      await reorderSprintItem(sprintItemId, targetSprintId, afterOf);
      return;
    }

    const sprintItem = getLocalItemsRef(sourceSprintId).value.find((i) => i.id === sprintItemId);
    if (!sprintItem?.issue) return;

    const sourceLocal = getLocalItemsRef(sourceSprintId).value;
    const sourceIndex = sourceLocal.findIndex((i) => i.id === sprintItemId);
    if (sourceIndex >= 0) sourceLocal.splice(sourceIndex, 1);

    await removeSprintItem(sprintItemId, sourceSprintId);
    await addSprintItem(targetSprintId, sprintItem.issue.id, sprintItem.issue);
    syncLocalFromStore(targetSprintId);
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
