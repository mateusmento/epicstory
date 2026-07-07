<script setup lang="ts">
import BoardColumn from "@/presentationals/board/BoardColumn.vue";
import BoardItem from "@/presentationals/board/BoardItem.vue";
import { cn } from "@/design-system/utils";
import { useBacklog } from "@/domain/backlog";
import { issueFiltersForQuery, useProjectContext, useProjectFilters } from "@/domain/project";
import { useSprint } from "@/domain/sprint";
import type { IIssue, IBacklogItem } from "@epicstory/contracts";
import type { IDnDPayload } from "@vue-dnd-kit/core";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import IssueCard from "@/containers/views/project/board/IssueCard.vue";
import { Button, ScrollArea } from "@/design-system";

const props = defineProps<{ workspaceId: string; projectId: string }>();

const { backlogItems, fetchBacklogItems, updateIssue, moveBacklogItem, addLabel, removeLabel } = useBacklog();
const { filters: activeFilters } = useProjectFilters(+props.projectId);

const { ensureProjectContext } = useProjectContext();
const { sprints, sprintItems, fetchSprints, fetchSprintItems } = useSprint();
const sprintView = ref(false);
const teamId = ref<number>(0);

const activeSprint = computed(() => sprints.value.find((s) => s.status === "active") ?? null);

const sprintBacklogItems = computed<IBacklogItem[]>(() => {
  if (!activeSprint.value) return [];
  const sprintIssueIds = new Set((sprintItems.value.get(activeSprint.value.id) ?? []).map((i) => i.issue.id));
  return backlogItems.value.filter((b) => sprintIssueIds.has(b.issue.id));
});

const displayedBacklogItems = computed<IBacklogItem[]>(() =>
  sprintView.value ? sprintBacklogItems.value : backlogItems.value,
);

type ColumnStatus = "todo" | "doing" | "done";

const todo = ref<IBacklogItem[]>([]);
const doing = ref<IBacklogItem[]>([]);
const done = ref<IBacklogItem[]>([]);

const router = useRouter();

function openIssue(issue: IIssue) {
  router.push(`/${props.workspaceId}/project/${props.projectId}/issue/${issue.id}`);
}

function syncFromBacklogItems(items: IBacklogItem[]) {
  const source = sprintView.value ? sprintBacklogItems.value : items;
  const nextTodo: IBacklogItem[] = [];
  const nextDoing: IBacklogItem[] = [];
  const nextDone: IBacklogItem[] = [];

  for (const it of source) {
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

async function onColumnDrop(targetStatus: ColumnStatus, args: { payload: IDnDPayload }) {
  const activeId = args.payload.items[0]?.id;
  if (typeof activeId !== "number") return;

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
  const [, project] = await Promise.all([
    fetchBacklogItems({
      projectId: +props.projectId,
      page: 0,
      count: 200,
      orderBy: "manual",
      order: "asc",
      filters: issueFiltersForQuery(activeFilters.value),
    }),
    ensureProjectContext(+props.projectId),
  ]);

  teamId.value = project.teamId;
  await fetchSprints(teamId.value);
  const active = sprints.value.find((s) => s.status === "active");
  if (active) await fetchSprintItems(active.id);
});

watch(
  () => [props.projectId, activeFilters.value],
  async () => {
    // Allow the backlogItems watcher to re-sync the columns after refetching.
    todo.value.splice(0, todo.value.length);
    doing.value.splice(0, doing.value.length);
    done.value.splice(0, done.value.length);

    await fetchBacklogItems({
      projectId: +props.projectId,
      page: 0,
      count: 200,
      orderBy: "manual",
      order: "asc",
      filters: issueFiltersForQuery(activeFilters.value),
    });
  },
);

watch(
  backlogItems,
  (items) => {
    // Avoid stomping local DnD mutations; only auto-sync when first loading.
    if (todo.value.length || doing.value.length || done.value.length) return;
    syncFromBacklogItems(items);
  },
  { immediate: true },
);

watch(sprintView, () => {
  todo.value.splice(0);
  doing.value.splice(0);
  done.value.splice(0);
  syncFromBacklogItems(backlogItems.value);
});

const BOARD_COLUMN_CLASSES = "flex:col-lg flex-shrink-0 w-96 min-w-96 rounded-xl bg-muted/40";

const BOARD_COLUMN_INNER = "!flex flex:col-md flex-1 min-h-0 m-2 rounded-lg";
</script>

<template>
  <div class="flex:col-xl w-full h-full p-2">
    <!-- Sprint filter toggle -->
    <div v-if="teamId" class="flex:row-md flex:center-y mb-2">
      <Button
        :variant="!sprintView ? 'outline' : 'ghost'"
        size="sm"
        class="text-xs"
        @click="
          sprintView = false;
          syncFromBacklogItems(backlogItems);
        "
      >
        All issues
      </Button>
      <Button
        :variant="sprintView ? 'outline' : 'ghost'"
        size="sm"
        class="text-xs"
        @click="
          sprintView = true;
          syncFromBacklogItems(backlogItems);
        "
      >
        Sprint view
        <span v-if="activeSprint" class="ml-1 text-muted-foreground">({{ activeSprint.name }})</span>
      </Button>
    </div>

    <div class="flex:row gap-lg flex-1 min-h-0">
      <!-- TODO column -->
      <BoardColumn
        group="project-board"
        v-model="todo"
        :class="BOARD_COLUMN_CLASSES"
        @drop="onColumnDrop('todo', $event)"
      >
        <div class="flex:row-md flex:center-y justify-between p-4 pb-0">
          <div class="text-sm font-semibold text-foreground">To do</div>
          <div class="text-xs text-secondary-foreground bg-secondary px-2 py-1 rounded-full">
            {{ counts.todo }}
          </div>
        </div>

        <ScrollArea>
          <div :class="cn(BOARD_COLUMN_INNER)">
            <TransitionGroup name="board-column">
              <BoardItem
                v-for="item in todo"
                :key="item.id"
                group="project-board"
                :source="todo"
                :itemId="item.id"
              >
                <IssueCard
                  :item="item"
                  @open-issue="openIssue"
                  @add-label="addLabel(item.issue.id, $event)"
                  @remove-label="removeLabel(item.issue.id, $event)"
                />
              </BoardItem>
            </TransitionGroup>

            <div
              v-if="todo.length === 0"
              class="flex items-center justify-center h-24 text-sm text-secondary-foreground"
            >
              No issues
            </div>
          </div>
        </ScrollArea>
      </BoardColumn>

      <!-- DOING column -->
      <BoardColumn
        group="project-board"
        v-model="doing"
        :class="BOARD_COLUMN_CLASSES"
        @drop="onColumnDrop('doing', $event)"
      >
        <div class="flex:row-md flex:center-y justify-between px-4 pt-4">
          <div class="text-sm font-semibold text-foreground">In progress</div>
          <div class="text-xs text-secondary-foreground bg-secondary px-2 py-1 rounded-full">
            {{ counts.doing }}
          </div>
        </div>

        <ScrollArea>
          <div :class="cn(BOARD_COLUMN_INNER)">
            <TransitionGroup name="board-column">
              <BoardItem
                v-for="item in doing"
                :key="item.id"
                group="project-board"
                :source="doing"
                :itemId="item.id"
              >
                <IssueCard
                  :item="item"
                  @open-issue="openIssue"
                  @add-label="addLabel(item.issue.id, $event)"
                  @remove-label="removeLabel(item.issue.id, $event)"
                />
              </BoardItem>
            </TransitionGroup>

            <div
              v-if="doing.length === 0"
              class="flex items-center justify-center h-24 text-sm text-secondary-foreground"
            >
              No issues
            </div>
          </div>
        </ScrollArea>
      </BoardColumn>

      <!-- DONE column -->
      <BoardColumn
        group="project-board"
        v-model="done"
        :class="BOARD_COLUMN_CLASSES"
        @drop="onColumnDrop('done', $event)"
      >
        <div class="flex:row-md flex:center-y justify-between px-4 pt-4">
          <div class="text-sm font-semibold text-foreground">Done</div>
          <div class="text-xs text-secondary-foreground bg-secondary px-2 py-1 rounded-full">
            {{ counts.done }}
          </div>
        </div>

        <ScrollArea>
          <div :class="cn(BOARD_COLUMN_INNER)">
            <TransitionGroup name="board-column">
              <BoardItem
                v-for="item in done"
                :key="item.id"
                group="project-board"
                :source="done"
                :itemId="item.id"
              >
                <IssueCard
                  :item="item"
                  @open-issue="openIssue"
                  @add-label="addLabel(item.issue.id, $event)"
                  @remove-label="removeLabel(item.issue.id, $event)"
                />
              </BoardItem>
            </TransitionGroup>

            <div
              v-if="done.length === 0"
              class="flex items-center justify-center h-24 text-sm text-secondary-foreground"
            >
              No issues
            </div>
          </div>
        </ScrollArea>
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
