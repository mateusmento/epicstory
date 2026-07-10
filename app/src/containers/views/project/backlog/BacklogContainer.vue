<script lang="tsx" setup>
import { IssueContextMenu } from "@/containers/issue";
import { Icon } from "@/design-system/icons";
import { useBacklog } from "@/domain/backlog";
import { issueFiltersForQuery, useProjectFilters } from "@/domain/project";
import { useSprint } from "@/domain/sprint";
import { issueStatusDotClass } from "@/presentationals/issue/status/status-fns";
import { useDraggingById } from "@/presentationals/board";
import Signal1Bar from "@/presentationals/issue/priority-toggler/Signal1Bar.vue";
import Signal2Bars from "@/presentationals/issue/priority-toggler/Signal2Bars.vue";
import Signal3Bars from "@/presentationals/issue/priority-toggler/Signal3Bars.vue";
import UrgentIcon from "@/presentationals/issue/priority-toggler/Urgent.vue";
import { IssueList } from "@/presentationals/issue";
import SprintPlanItem from "@/presentationals/sprint/SprintPlanItem.vue";
import { applySortableTransferById } from "@/presentationals/board/sortable";
import { flyToPlaceTransition } from "@/presentationals/board/transition";
import type { IIssue, IBacklogItem } from "@epicstory/contracts";
import { useDnDStore, useDroppable } from "@vue-dnd-kit/core";
import { useStorage } from "@vueuse/core";
import { concat, uniq } from "lodash";
import { computed, onMounted, reactive, watch, watchEffect } from "vue";
import { useRouter } from "vue-router";
import BacklogItemRow from "./BacklogItemRow.vue";
import { provideBacklogRowContext } from "./backlog-row.context";

const props = defineProps<{ workspaceId: string; projectId: string }>();

const { backlogItems, fetchBacklogItems, moveBacklogItem, updateIssue } = useBacklog();
const { filters: activeFilters } = useProjectFilters(+props.projectId);
const { isDragging } = useDraggingById();
const { removeSprintItem } = useSprint();
const dndStore = useDnDStore();

const orderBy = useStorage("backlog.orderBy", "manual");
const order = useStorage<"asc" | "desc">("backlog.order", "asc");
type GroupBy = "none" | "status" | "priority";
const groupBy = useStorage<GroupBy>("backlog.groupBy", "status", localStorage, {
  listenToStorageChanges: true,
});
const collapsedGroups = useStorage<Record<string, boolean>>("backlog.groupCollapsed", {});

const GRID_COLS = "grid-cols-[16px_88px_1fr_100px_80px_110px_32px]";

function toggleOrder(column: string) {
  orderBy.value = column;
  order.value = order.value === "asc" ? "desc" : "asc";
}

function resetOrder() {
  orderBy.value = "manual";
  order.value = "asc";
}

const isDndEnabled = computed(() => groupBy.value === "none" && orderBy.value === "manual");

const draggingSourceType = computed(
  () => dndStore.draggingElements.value.values().next().value?.data?.sourceType ?? null,
);

const showSprintBacklogDropzone = computed(
  () => dndStore.isDragging.value && draggingSourceType.value === "sprint",
);

// Plain reactive object — vue-dnd-kit stores `data` by reference at register time.
const droppableData = reactive<{ source: IBacklogItem[]; targetType: "backlog" }>({
  source: backlogItems.value,
  targetType: "backlog",
});
watchEffect(() => {
  droppableData.source = backlogItems.value;
});

const { elementRef: itemsContainerRef } = useDroppable({
  groups: ["sprint-plan"],
  data: droppableData,
  events: {
    onHover: (store) => {
      if (!isDndEnabled.value) return;
      const draggingEl = store?.draggingElements?.value?.values?.().next?.().value ?? null;
      if (draggingEl?.data?.sourceType !== "backlog") return;
      applySortableTransferById(store);
    },
    onDrop: async (store, payload) => {
      const active = payload.items[0] as
        | { id?: string | number; data?: { sourceType?: string; sprintId?: number } }
        | undefined;
      const activeId = active?.id;
      const sourceType = active?.data?.sourceType;

      if (sourceType === "sprint" && typeof activeId === "number") {
        const sprintId = active?.data?.sprintId;
        if (typeof sprintId === "number") {
          await removeSprintItem(activeId, sprintId);
        }
        return flyToPlaceTransition(store, payload);
      }

      if (typeof activeId !== "string" || !activeId.startsWith("b-")) {
        return flyToPlaceTransition(store, payload);
      }
      if (!isDndEnabled.value) return flyToPlaceTransition(store, payload);
      const backlogItemId = +activeId.slice(2);
      const idx = backlogItems.value.findIndex((i) => i.id === backlogItemId);
      const afterOf = idx > 0 ? backlogItems.value[idx - 1].id : undefined;
      await moveBacklogItem(backlogItemId, { projectId: +props.projectId, afterOf });
      return flyToPlaceTransition(store, payload);
    },
  },
});

onMounted(async () => {
  await fetchBacklogItems({
    projectId: +props.projectId,
    order: order.value,
    orderBy: orderBy.value,
    page: 0,
    count: 150,
    filters: issueFiltersForQuery(activeFilters.value),
  });
});

watch(
  () => [props.projectId, orderBy.value, order.value, activeFilters.value],
  async () => {
    fetchBacklogItems({
      projectId: +props.projectId,
      order: order.value,
      orderBy: orderBy.value,
      page: 0,
      count: 150,
      filters: issueFiltersForQuery(activeFilters.value),
    });
  },
);

const editingIssue = reactive<{ id: number | null; title: string }>({ id: null, title: "" });

function openIssueEdit(issue: IIssue) {
  editingIssue.title = issue.title;
  editingIssue.id = issue.id;
}

function closeIssueEdit() {
  editingIssue.id = null;
  editingIssue.title = "";
}

function saveEdit() {
  const id = editingIssue.id;
  if (!id) return closeIssueEdit();
  const title = editingIssue.title.trim();
  if (!title) return closeIssueEdit();
  updateIssue(id, { title });
  closeIssueEdit();
}

const router = useRouter();

function openIssue(issue: IIssue) {
  router.push(`/${props.workspaceId}/project/${props.projectId}/issue/${issue.id}`);
}

function toggleGroup(groupId: string) {
  collapsedGroups.value = {
    ...collapsedGroups.value,
    [groupId]: !collapsedGroups.value[groupId],
  };
}

function isCollapsed(groupId: string) {
  return Boolean(collapsedGroups.value[groupId]);
}

const statusOrder = ["doing", "todo", "backlog", "done"];
const statusLabel: Record<string, string> = {
  doing: "In Progress",
  todo: "Todo",
  backlog: "Backlog",
  done: "Done",
};

const priorityOrder = [4, 3, 2, 1, 0];
const priorityLabel = ["No priority", "Low", "Medium", "High", "Urgent"];

type IssueGroup = {
  id: string;
  label: string;
  kind: "status" | "priority" | "none";
  key: string | number;
  items: IBacklogItem[];
};

function mapBy<T, K extends string | number>(items: T[], keySelector: (item: T) => K) {
  const by = new Map<K, T[]>();
  for (const it of items) {
    const key = keySelector(it);
    by.set(key, [...(by.get(key) ?? []), it]);
  }
  return by;
}

const groupedItems = computed<IssueGroup[]>(() => {
  const items = backlogItems.value ?? [];

  if (groupBy.value === "priority") {
    const by = mapBy(items, (it) => it.issue.priority ?? 0);
    return priorityOrder
      .filter((p) => (by.get(p) ?? []).length > 0)
      .map((p) => ({
        id: `priority:${p}`,
        label: priorityLabel[p] ?? `Priority ${p}`,
        kind: "priority" as const,
        key: p,
        items: by.get(p) ?? [],
      }));
  }

  if (groupBy.value === "status") {
    const by = mapBy(items, (it) => it.issue.status ?? "todo");
    const keys = uniq(concat(statusOrder, [...by.keys()]));
    return keys
      .filter((k) => (by.get(k) ?? []).length > 0)
      .map((k) => ({
        id: `status:${k}`,
        label: statusLabel[k] ?? k,
        kind: "status" as const,
        key: k,
        items: by.get(k) ?? [],
      }));
  }

  return [
    {
      id: "all",
      label: "All issues",
      kind: "none" as const,
      key: "all",
      items,
    },
  ];
});

provideBacklogRowContext({
  workspaceId: +props.workspaceId,
  gridColsClass: GRID_COLS,
  editing: editingIssue,
  openIssue,
  startEdit: openIssueEdit,
  cancelEdit: closeIssueEdit,
  saveEdit,
});
</script>

<template>
  <IssueList :order-by="orderBy" :order="order" @sort="toggleOrder" @reset-sort="resetOrder">
    <div ref="itemsContainerRef" class="min-h-48 divide-y">
      <!-- Flat/manual mode: draggable with vue-dnd-kit -->
      <template v-if="groupBy === 'none'">
        <SprintPlanItem
          v-for="{ id: itemId, issue } of backlogItems"
          :key="issue.id"
          group="sprint-plan"
          :item-id="`b-${itemId}`"
          :source="backlogItems"
          :item-data="{ sourceType: 'backlog', backlogItemId: itemId, issue, issueId: issue.id }"
        >
          <IssueContextMenu :issue="issue">
            <BacklogItemRow
              :item-id="itemId"
              :issue="issue"
              :dragging="isDragging(`b-${itemId}`)"
              drag-handle-title="Drag to reorder or add to sprint"
              :drag-handle-force-hidden="orderBy !== 'manual'"
            />
          </IssueContextMenu>
        </SprintPlanItem>
      </template>

      <!-- Grouped mode: static rows, no DnD -->
      <template v-else>
        <template v-for="group of groupedItems" :key="group.id">
          <button
            type="button"
            class="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted"
            @click="toggleGroup(group.id)"
          >
            <div class="flex items-center gap-2 text-sm">
              <Icon
                :name="isCollapsed(group.id) ? 'oi-chevron-down' : 'oi-chevron-up'"
                class="w-3 h-3 text-muted-foreground"
              />
              <span
                v-if="group.kind === 'status'"
                class="w-2 h-2 rounded-full ring-1 ring-border"
                :class="issueStatusDotClass(group.key.toString())"
              />
              <span v-else-if="group.kind === 'priority'" class="opacity-60 scale-75 origin-left">
                <UrgentIcon v-if="group.key === 4" />
                <Signal3Bars v-else-if="group.key === 3" />
                <Signal2Bars v-else-if="group.key === 2" />
                <Signal1Bar v-else-if="group.key === 1" />
              </span>
              <span class="font-medium text-muted-foreground">{{ group.label }}</span>
            </div>
            <span class="text-xs text-muted-foreground tabular-nums">{{ group.items.length }}</span>
          </button>

          <div v-show="!isCollapsed(group.id)" class="divide-y">
            <IssueContextMenu v-for="{ id: itemId, issue } of group.items" :key="issue.id" :issue="issue">
              <BacklogItemRow
                :item-id="itemId"
                :issue="issue"
                :dragging="false"
                drag-handle-title="Drag disabled while grouped"
              />
            </IssueContextMenu>
          </div>
        </template>
      </template>
    </div>

    <template #overlay>
      <div
        v-if="showSprintBacklogDropzone"
        class="absolute inset-0 z-10 p-4 flex bg-white pointer-events-none"
        aria-hidden="true"
      >
        <div class="flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-border">
          <span class="px-4 text-center">Move item back to backlog</span>
        </div>
      </div>
    </template>
  </IssueList>
</template>
