<script setup lang="ts">
import BoardColumn from "@/components/board/BoardColumn.vue";
import BoardItem from "@/components/board/BoardItem.vue";
import { cn } from "@/design-system/utils";
import { useBacklog, type BacklogItem } from "@/domain/backlog";
import type { Issue } from "@/domain/issues";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import IssueCard from "./IssueCard.vue";

const props = defineProps<{ workspaceId: string; projectId: string }>();

const { backlogItems, fetchBacklogItems, updateIssue, moveBacklogItem } = useBacklog();

type ColumnStatus = "todo" | "doing" | "done";

const todo = ref<BacklogItem[]>([]);
const doing = ref<BacklogItem[]>([]);
const done = ref<BacklogItem[]>([]);

const router = useRouter();

function openIssue(issue: Issue) {
  router.push(`/${props.workspaceId}/project/${props.projectId}/issue/${issue.id}`);
}

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
  await moveBacklogItem(item.id, {
    projectId: +props.projectId,
    afterOf,
  });
}

onMounted(async () => {
  await fetchBacklogItems({
    projectId: +props.projectId,
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
    <div class="flex:row-xl flex-1 min-h-0 overflow-x-auto">
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
              <IssueCard :item="item" @open-issue="openIssue" />
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
              <IssueCard :item="item" @open-issue="openIssue" />
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
              <IssueCard :item="item" @open-issue="openIssue" />
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
