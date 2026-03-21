<script lang="tsx" setup>
import { IssueContextMenu } from "@/components/issue";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { useBacklog, type BacklogItem } from "@/domain/backlog";
import { type Issue } from "@/domain/issues";
import { animations } from "@formkit/drag-and-drop";
import { dragAndDrop } from "@formkit/drag-and-drop/vue";
import { useStorage } from "@vueuse/core";
import { concat, debounce, uniq } from "lodash";
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
  withModifiers,
  type FunctionalComponent as FC,
} from "vue";
import { useRouter } from "vue-router";
import BacklogItemRow from "./BacklogItemRow.vue";
import { provideBacklogRowContext } from "./backlog-row.context";
import Signal1Bar from "./priority-toggler/Signal1Bar.vue";
import Signal2Bars from "./priority-toggler/Signal2Bars.vue";
import Signal3Bars from "./priority-toggler/Signal3Bars.vue";
import UrgentIcon from "./priority-toggler/Urgent.vue";

const props = defineProps<{ workspaceId: string; projectId: string }>();

const {
  backlogItems,
  fetchBacklogItems,
  moveBacklogItem,
  updateIssue,
  addAssignee,
  removeAssignee,
  addLabel,
  removeLabel,
  removeIssue,
} = useBacklog();

const rowActions = { updateIssue, addAssignee, removeAssignee, addLabel, removeLabel, removeIssue };

const orderBy = useStorage("backlog.orderBy", "manual");
const order = useStorage<"asc" | "desc">("backlog.order", "asc");
type GroupBy = "none" | "status" | "priority";
const groupBy = useStorage<GroupBy>("backlog.groupBy", "status", localStorage, {
  listenToStorageChanges: true,
});
const collapsedGroups = useStorage<Record<string, boolean>>("backlog.groupCollapsed", {});

const GRID_COLS = "grid-cols-[16px_88px_1fr_100px_100px_110px_32px]";

function toggleOrder(column: string) {
  orderBy.value = column;
  order.value = order.value === "asc" ? "desc" : "asc";
}

function resetOrder() {
  orderBy.value = "manual";
  order.value = "asc";
}

const onMoveBacklogItem = debounce(moveBacklogItem, 500, { leading: false });

const itemsContainer = ref<HTMLElement>();

const draggingId = ref<number | null>(null);

function setupDragAndDrop() {
  dragAndDrop<BacklogItem>({
    parent: itemsContainer,
    values: backlogItems,
    plugins: [animations({ duration: 200 })],
    disabled: orderBy.value !== "manual" || groupBy.value !== "none",
    onDragstart(e) {
      const item = e.draggedNode.data.value as BacklogItem;
      draggingId.value = item.id;
    },
    onDragend() {
      draggingId.value = null;
    },
    async onSort({ draggedNode, position, values }) {
      const { id } = draggedNode.data.value as any;
      const { id: afterOf } = (values[position - 1] as any) ?? {};
      await onMoveBacklogItem(id, {
        projectId: +props.projectId,
        afterOf,
      });
    },
  });
}

watch(orderBy, setupDragAndDrop);
watch(groupBy, setupDragAndDrop);

onMounted(async () => {
  await fetchBacklogItems({
    projectId: +props.projectId,
    order: order.value,
    orderBy: orderBy.value,
    page: 0,
    count: 150,
  });

  setupDragAndDrop();
});

watch(
  () => [props.projectId, orderBy.value, order.value],
  async () => {
    fetchBacklogItems({
      projectId: +props.projectId,
      order: order.value,
      orderBy: orderBy.value,
      page: 0,
      count: 150,
    });
  },
);

const editingIssue = reactive<{
  id: number | null;
  title: string;
}>({ id: null, title: "" });

function openIssueEdit(issue: Issue) {
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

function updateIssueStatus(issue: Issue, status: string) {
  updateIssue(issue.id, { status });
}

function issueStatusDotClass(status: string) {
  if (status === "doing") return "bg-blue-500";
  if (status === "done") return "bg-emerald-500";
  return "bg-zinc-300";
}

const router = useRouter();

function openIssue(issue: Issue) {
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
  items: BacklogItem[];
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

async function onLabelsChange(issue: Issue, nextIds: number[]) {
  if (!issue) return;
  const prev = new Set((issue.labels ?? []).map((l) => l.id));
  const next = new Set(nextIds);

  // Add new labels
  for (const id of next) {
    if (!prev.has(id)) {
      await addLabel(issue.id, id);
    }
  }

  // Remove missing labels
  for (const id of prev) {
    if (!next.has(id)) {
      await removeLabel(issue.id, id);
    }
  }
}

provideBacklogRowContext({
  workspaceId: +props.workspaceId,
  gridColsClass: GRID_COLS,
  editing: editingIssue,
  actions: rowActions,
  openIssue,
  startEdit: openIssueEdit,
  cancelEdit: closeIssueEdit,
  saveEdit,
  updateIssueStatus,
  statusDotClass: issueStatusDotClass,
  onLabelsChange,
});
</script>

<script lang="tsx">
type Props = {
  show: boolean;
  order: "asc" | "desc";
  label: string;
};

type Emits = {
  click(): void;
  reset(): void;
};

const BacklogHeadCell: FC<Props, Emits> = ({ show, order, label }, { emit, slots }) => {
  return (
    <div
      class={cn("text-sm text-secondary-foreground select-none cursor-pointer flex:row-md flex:center-y", {
        "font-medium": show,
      })}
    >
      {slots.default?.() ?? label}
      <div class="group">
        <div class={cn("group-hover:hidden", { "opacity-0": !show })}>
          <Icon name={`hi-arrow-sm-${order === "asc" ? "down" : "up"}`} />
        </div>
        <div
          class={cn("hidden group-hover:block", { "opacity-0": !show })}
          onClick={withModifiers(() => emit("reset"), ["stop"])}
        >
          <Icon name="io-close" />
        </div>
      </div>
    </div>
  );
};
</script>

<template>
  <div class="w-full h-full min-h-0 bg-white">
    <div class="flex flex-col w-full h-full min-h-0 bg-white overflow-hidden">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b pl-3 pr-6 py-2">
        <div class="flex items-center justify-between gap-4">
          <div class="grid gap-x-4 items-center flex-1 min-w-0" :class="GRID_COLS">
            <div />
            <BacklogHeadCell
              label="Issue"
              :show="orderBy === 'status'"
              :order="order"
              @click="toggleOrder('status')"
              @reset="resetOrder"
            />
            <BacklogHeadCell
              label="Title"
              :show="orderBy === 'title'"
              :order="order"
              @click="toggleOrder('title')"
              @reset="resetOrder"
            />
            <BacklogHeadCell
              label="Priority"
              :show="orderBy === 'priority'"
              :order="order"
              @click="toggleOrder('priority')"
              @reset="resetOrder"
            />
            <div class="text-sm text-secondary-foreground select-none">Assignees</div>
            <BacklogHeadCell
              label="Due Date"
              :show="orderBy === 'dueDate'"
              :order="order"
              @click="toggleOrder('dueDate')"
              @reset="resetOrder"
            />
            <div />
          </div>
        </div>
      </div>

      <!-- List -->
      <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style="scrollbar-gutter: stable">
        <div ref="itemsContainer" class="divide-y">
          <template v-if="groupBy === 'none'">
            <IssueContextMenu
              v-for="{ id: itemId, issue } of backlogItems"
              :key="issue.id"
              :issue="issue"
              :workspace-id="+props.workspaceId"
              :actions="rowActions"
            >
              <BacklogItemRow
                :item-id="itemId"
                :issue="issue"
                :dragging="draggingId === itemId"
                drag-handle-title="Drag to reorder"
                :drag-handle-force-hidden="orderBy !== 'manual'"
              />
            </IssueContextMenu>
          </template>

          <template v-else>
            <template v-for="group of groupedItems" :key="group.id">
              <button
                type="button"
                class="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 hover:bg-zinc-100"
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
                    :class="issueStatusDotClass(group.key as string)"
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
                <IssueContextMenu
                  v-for="{ id: itemId, issue } of group.items"
                  :key="issue.id"
                  :issue="issue"
                  :workspace-id="+props.workspaceId"
                  :actions="rowActions"
                >
                  <BacklogItemRow
                    :item-id="itemId"
                    :issue="issue"
                    :dragging="draggingId === itemId"
                    drag-handle-title="Drag disabled while grouped"
                  />
                </IssueContextMenu>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
