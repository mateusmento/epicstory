<script setup lang="ts">
import BoardColumn from "@/components/board/BoardColumn.vue";
import BoardItem from "@/components/board/BoardItem.vue";
import { useDraggingById } from "@/components/board/useDraggingById";
import { useDependency } from "@/core/dependency-injection";
import { cn } from "@/design-system/utils";
import { useBacklog, type BacklogItem } from "@/domain/backlog";
import type { Issue } from "@/domain/issues";
import { ProjectApi } from "@/domain/project";
import { formatDistanceToNow } from "date-fns";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{ workspaceId: string; projectId: string }>();

const router = useRouter();
const projectApi = useDependency(ProjectApi);

const { backlogItems, fetchBacklogItems, updateIssue, moveBacklogItem } = useBacklog();
const backlogId = ref<number>(0);

type ColumnStatus = "todo" | "doing" | "done";

const todo = ref<BacklogItem[]>([]);
const doing = ref<BacklogItem[]>([]);
const done = ref<BacklogItem[]>([]);

function syncFromBacklogItems(items: BacklogItem[]) {
  const nextTodo: BacklogItem[] = [];
  const nextDoing: BacklogItem[] = [];
  const nextDone: BacklogItem[] = [];

  for (const it of items) {
    const s = (it?.issue?.status ?? "todo") as ColumnStatus;
    if (s === "doing") nextDoing.push(it);
    else if (s === "done") nextDone.push(it);
    else nextTodo.push(it);
  }

  todo.value.splice(0, todo.value.length, ...nextTodo);
  doing.value.splice(0, doing.value.length, ...nextDoing);
  done.value.splice(0, done.value.length, ...nextDone);
}

const counts = computed(() => ({
  todo: todo.value.length,
  doing: doing.value.length,
  done: done.value.length,
}));

const { isDragging } = useDraggingById();

function formatDueDate(date: string | null | undefined) {
  if (!date) return null;
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return null;
  }
}

function issuePriorityBadge(priority: number | null | undefined) {
  if (!priority || priority <= 0) return null;
  if (priority >= 3) return { label: `P${priority}`, cls: "bg-red-100 text-red-700 border-red-200" };
  if (priority >= 2) return { label: `P${priority}`, cls: "bg-orange-100 text-orange-700 border-orange-200" };
  return { label: `P${priority}`, cls: "bg-yellow-100 text-yellow-800 border-yellow-200" };
}

function statusBadge(status: ColumnStatus) {
  if (status === "doing") return { label: "In progress", cls: "bg-blue-100 text-blue-700 border-blue-200" };
  if (status === "done") return { label: "Done", cls: "bg-green-100 text-green-700 border-green-200" };
  return { label: "To do", cls: "bg-gray-100 text-gray-700 border-gray-200" };
}

function openIssue(issue: Issue) {
  router.push(`/${props.workspaceId}/project/${props.projectId}/issue/${issue.id}`);
}

async function onColumnDrop(targetStatus: ColumnStatus, args: { payload: any }) {
  const activeId = args?.payload?.items?.[0]?.id as number | undefined;
  if (!activeId) return;

  const all = [...todo.value, ...doing.value, ...done.value];
  const item = all.find((x) => x.id === activeId);
  if (!item?.issue) return;

  const targetList =
    targetStatus === "todo" ? todo.value : targetStatus === "doing" ? doing.value : done.value;
  const droppedIndex = targetList.findIndex((x) => x.id === activeId);
  const afterOf = droppedIndex > 0 ? targetList[droppedIndex - 1]?.id : undefined;

  const current = (item.issue.status ?? "todo") as ColumnStatus;

  // Persist status change (if any).
  if (current !== targetStatus) {
    // Optimistic UI: keep the card/badges consistent instantly.
    item.issue.status = targetStatus;
    await updateIssue(item.issue.id, { status: targetStatus });
  }

  // Persist ordering within the backlog, based on the final dropped position.
  // Backend expects backlog-item ids (not issue ids) for `afterOf`.
  if (backlogId.value) {
    await moveBacklogItem(item.id, {
      backlogId: backlogId.value,
      afterOf,
    });
  }
}

onMounted(async () => {
  const project = await projectApi.findProject(+props.projectId);
  backlogId.value = project.backlogId;

  await fetchBacklogItems({
    backlogId: backlogId.value,
    page: 0,
    count: 200,
    orderBy: "manual",
    order: "asc",
  } as any);

  // The watch below will do the initial sync.
});

watch(
  backlogItems,
  (items) => {
    // Avoid stomping local DnD mutations; only auto-sync when first loading.
    if (todo.value.length || doing.value.length || done.value.length) return;
    syncFromBacklogItems(items);
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex:col-xl w-full h-full px-6 py-6 overflow-hidden">
    <div class="flex:row-md flex:center-y justify-between">
      <div class="flex:col-sm">
        <div class="text-foreground font-semibold">Board</div>
        <div class="text-xs text-secondary-foreground">Drag issues between columns to update status</div>
      </div>
    </div>

    <div class="flex:row-xl flex-1 min-h-0 overflow-x-auto pt-4">
      <!-- TODO column -->
      <BoardColumn
        group="project-board"
        v-model="todo"
        class="flex:col-lg flex-shrink-0 w-80 min-w-80 rounded-xl border border-border bg-background/60"
        @drop="onColumnDrop('todo', $event)"
      >
        <div class="flex:row-md flex:center-y justify-between px-4 pt-4">
          <div class="text-sm font-semibold text-foreground">To do</div>
          <div class="text-xs text-secondary-foreground bg-secondary px-2 py-1 rounded-full">
            {{ counts.todo }}
          </div>
        </div>

        <div :class="cn('flex:col-md flex-1 min-h-0 m-3 p-3 rounded-lg overflow-y-auto', 'bg-secondary/30')">
          <TransitionGroup name="board-column">
            <BoardItem
              v-for="item in todo"
              :key="item.id"
              group="project-board"
              :source="todo"
              :itemId="item.id"
            >
              <div
                :class="
                  cn(
                    'group bg-white rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-move',
                    {
                      'opacity-0': isDragging(item.id),
                      'border-dashed border-2 bg-transparent shadow-none': isDragging(item.id),
                    },
                  )
                "
                @dblclick.stop="openIssue(item.issue)"
              >
                <div class="flex:row-md flex:center-y justify-between gap-2">
                  <div class="font-medium text-sm text-foreground line-clamp-2">
                    {{ item.issue.title || "Untitled issue" }}
                  </div>
                  <div class="text-[11px] text-secondary-foreground">#{{ item.issue.id }}</div>
                </div>

                <div class="mt-2 flex:row-md flex:center-y gap-2 flex-wrap">
                  <span
                    :class="[
                      'text-xs px-2 py-0.5 rounded border font-medium capitalize',
                      statusBadge(item.issue.status as any).cls,
                    ]"
                  >
                    {{ statusBadge(item.issue.status as any).label }}
                  </span>

                  <span
                    v-if="issuePriorityBadge(item.issue.priority)"
                    :class="[
                      'text-xs px-2 py-0.5 rounded border font-medium',
                      issuePriorityBadge(item.issue.priority)!.cls,
                    ]"
                  >
                    {{ issuePriorityBadge(item.issue.priority)!.label }}
                  </span>

                  <span v-if="formatDueDate(item.issue.dueDate)" class="text-xs text-secondary-foreground">
                    Due {{ formatDueDate(item.issue.dueDate) }}
                  </span>
                </div>

                <div
                  v-if="item.issue.description"
                  class="text-xs text-secondary-foreground line-clamp-2 mt-2"
                >
                  {{ item.issue.description }}
                </div>

                <div v-if="item.issue.assignees?.length" class="flex:row-md mt-3">
                  <img
                    v-for="(assignee, i) in item.issue.assignees.slice(0, 5)"
                    :key="assignee.id"
                    :src="assignee.picture"
                    :class="cn('w-6 h-6 rounded-full border-2 border-white object-cover', i > 0 && '-ml-4')"
                    :title="assignee.name"
                  />
                  <div
                    v-if="item.issue.assignees.length > 5"
                    class="w-6 h-6 rounded-full bg-secondary text-secondary-foreground border-2 border-white -ml-4 flex items-center justify-center text-[10px]"
                    :title="`+${item.issue.assignees.length - 5} more`"
                  >
                    +{{ item.issue.assignees.length - 5 }}
                  </div>
                </div>
              </div>
            </BoardItem>
          </TransitionGroup>

          <div
            v-if="todo.length === 0"
            class="flex items-center justify-center h-24 text-sm text-secondary-foreground"
          >
            No issues
          </div>
        </div>
      </BoardColumn>

      <!-- DOING column -->
      <BoardColumn
        group="project-board"
        v-model="doing"
        class="flex:col-lg flex-shrink-0 w-80 min-w-80 rounded-xl border border-border bg-background/60"
        @drop="onColumnDrop('doing', $event)"
      >
        <div class="flex:row-md flex:center-y justify-between px-4 pt-4">
          <div class="text-sm font-semibold text-foreground">In progress</div>
          <div class="text-xs text-secondary-foreground bg-secondary px-2 py-1 rounded-full">
            {{ counts.doing }}
          </div>
        </div>

        <div :class="cn('flex:col-md flex-1 min-h-0 m-3 p-3 rounded-lg overflow-y-auto', 'bg-blue-500/10')">
          <TransitionGroup name="board-column">
            <BoardItem
              v-for="item in doing"
              :key="item.id"
              group="project-board"
              :source="doing"
              :itemId="item.id"
            >
              <div
                :class="
                  cn(
                    'group bg-white rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-move',
                    {
                      'opacity-0': isDragging(item.id),
                      'border-dashed border-2 bg-transparent shadow-none': isDragging(item.id),
                    },
                  )
                "
                @dblclick.stop="openIssue(item.issue)"
              >
                <div class="flex:row-md flex:center-y justify-between gap-2">
                  <div class="font-medium text-sm text-foreground line-clamp-2">
                    {{ item.issue.title || "Untitled issue" }}
                  </div>
                  <div class="text-[11px] text-secondary-foreground">#{{ item.issue.id }}</div>
                </div>

                <div class="mt-2 flex:row-md flex:center-y gap-2 flex-wrap">
                  <span
                    :class="[
                      'text-xs px-2 py-0.5 rounded border font-medium capitalize',
                      statusBadge(item.issue.status as any).cls,
                    ]"
                  >
                    {{ statusBadge(item.issue.status as any).label }}
                  </span>

                  <span
                    v-if="issuePriorityBadge(item.issue.priority)"
                    :class="[
                      'text-xs px-2 py-0.5 rounded border font-medium',
                      issuePriorityBadge(item.issue.priority)!.cls,
                    ]"
                  >
                    {{ issuePriorityBadge(item.issue.priority)!.label }}
                  </span>

                  <span v-if="formatDueDate(item.issue.dueDate)" class="text-xs text-secondary-foreground">
                    Due {{ formatDueDate(item.issue.dueDate) }}
                  </span>
                </div>

                <div
                  v-if="item.issue.description"
                  class="text-xs text-secondary-foreground line-clamp-2 mt-2"
                >
                  {{ item.issue.description }}
                </div>

                <div v-if="item.issue.assignees?.length" class="flex:row-md mt-3">
                  <img
                    v-for="(assignee, i) in item.issue.assignees.slice(0, 5)"
                    :key="assignee.id"
                    :src="assignee.picture"
                    :class="cn('w-6 h-6 rounded-full border-2 border-white object-cover', i > 0 && '-ml-4')"
                    :title="assignee.name"
                  />
                  <div
                    v-if="item.issue.assignees.length > 5"
                    class="w-6 h-6 rounded-full bg-secondary text-secondary-foreground border-2 border-white -ml-4 flex items-center justify-center text-[10px]"
                    :title="`+${item.issue.assignees.length - 5} more`"
                  >
                    +{{ item.issue.assignees.length - 5 }}
                  </div>
                </div>
              </div>
            </BoardItem>
          </TransitionGroup>

          <div
            v-if="doing.length === 0"
            class="flex items-center justify-center h-24 text-sm text-secondary-foreground"
          >
            No issues
          </div>
        </div>
      </BoardColumn>

      <!-- DONE column -->
      <BoardColumn
        group="project-board"
        v-model="done"
        class="flex:col-lg flex-shrink-0 w-80 min-w-80 rounded-xl border border-border bg-background/60"
        @drop="onColumnDrop('done', $event)"
      >
        <div class="flex:row-md flex:center-y justify-between px-4 pt-4">
          <div class="text-sm font-semibold text-foreground">Done</div>
          <div class="text-xs text-secondary-foreground bg-secondary px-2 py-1 rounded-full">
            {{ counts.done }}
          </div>
        </div>

        <div :class="cn('flex:col-md flex-1 min-h-0 m-3 p-3 rounded-lg overflow-y-auto', 'bg-green-500/10')">
          <TransitionGroup name="board-column">
            <BoardItem
              v-for="item in done"
              :key="item.id"
              group="project-board"
              :source="done"
              :itemId="item.id"
            >
              <div
                :class="
                  cn(
                    'group bg-white rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-move',
                    {
                      'opacity-0': isDragging(item.id),
                      'border-dashed border-2 bg-transparent shadow-none': isDragging(item.id),
                    },
                  )
                "
                @dblclick.stop="openIssue(item.issue)"
              >
                <div class="flex:row-md flex:center-y justify-between gap-2">
                  <div class="font-medium text-sm text-foreground line-clamp-2">
                    {{ item.issue.title || "Untitled issue" }}
                  </div>
                  <div class="text-[11px] text-secondary-foreground">#{{ item.issue.id }}</div>
                </div>

                <div class="mt-2 flex:row-md flex:center-y gap-2 flex-wrap">
                  <span
                    :class="[
                      'text-xs px-2 py-0.5 rounded border font-medium capitalize',
                      statusBadge(item.issue.status as any).cls,
                    ]"
                  >
                    {{ statusBadge(item.issue.status as any).label }}
                  </span>

                  <span
                    v-if="issuePriorityBadge(item.issue.priority)"
                    :class="[
                      'text-xs px-2 py-0.5 rounded border font-medium',
                      issuePriorityBadge(item.issue.priority)!.cls,
                    ]"
                  >
                    {{ issuePriorityBadge(item.issue.priority)!.label }}
                  </span>

                  <span v-if="formatDueDate(item.issue.dueDate)" class="text-xs text-secondary-foreground">
                    Due {{ formatDueDate(item.issue.dueDate) }}
                  </span>
                </div>

                <div
                  v-if="item.issue.description"
                  class="text-xs text-secondary-foreground line-clamp-2 mt-2"
                >
                  {{ item.issue.description }}
                </div>

                <div v-if="item.issue.assignees?.length" class="flex:row-md mt-3">
                  <img
                    v-for="(assignee, i) in item.issue.assignees.slice(0, 5)"
                    :key="assignee.id"
                    :src="assignee.picture"
                    :class="cn('w-6 h-6 rounded-full border-2 border-white object-cover', i > 0 && '-ml-4')"
                    :title="assignee.name"
                  />
                  <div
                    v-if="item.issue.assignees.length > 5"
                    class="w-6 h-6 rounded-full bg-secondary text-secondary-foreground border-2 border-white -ml-4 flex items-center justify-center text-[10px]"
                    :title="`+${item.issue.assignees.length - 5} more`"
                  >
                    +{{ item.issue.assignees.length - 5 }}
                  </div>
                </div>
              </div>
            </BoardItem>
          </TransitionGroup>

          <div
            v-if="done.length === 0"
            class="flex items-center justify-center h-24 text-sm text-secondary-foreground"
          >
            No issues
          </div>
        </div>
      </BoardColumn>
    </div>
  </div>
</template>

<style scoped>
.board-column-move {
  transition: transform 0.5s ease;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-clamp: 2;
}
</style>
