<script lang="tsx" setup>
import { UserSelect } from "@/components/user";
import { Button, Field, Form, Tooltip, TooltipContent, TooltipTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { useBacklog, type BacklogItem } from "@/domain/backlog";
import { type Issue } from "@/domain/issues";
import { animations } from "@formkit/drag-and-drop";
import { dragAndDrop } from "@formkit/drag-and-drop/vue";
import { parseAbsolute } from "@internationalized/date";
import { useStorage } from "@vueuse/core";
import { debounce } from "lodash";
import { Trash2Icon } from "lucide-vue-next";
import { onMounted, reactive, ref, watch, withModifiers, type FunctionalComponent as FC } from "vue";
import { useRouter } from "vue-router";
import { DueDatePicker } from "./date-picker";
import { PriorityToggler } from "./priority-toggler";

const props = defineProps<{ workspaceId: string; projectId: string }>();

const { backlogItems, fetchBacklogItems, removeBacklogItem, moveBacklogItem, updateIssue, addAssignee } =
  useBacklog();

const orderBy = useStorage("backlog.orderBy", "manual");
const order = useStorage<"asc" | "desc">("backlog.order", "asc");

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
    disabled: orderBy.value !== "manual",
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
      count: 50,
    });
  },
);

const editingIssue = reactive<{
  id: number | null;
  title: string;
}>({ id: null, title: "" });

function openIssueEdit(issue: Issue) {
  editingIssue.id = issue.id;
  editingIssue.title = issue.title;
}

function closeIssueEdit() {
  editingIssue.id = null;
  editingIssue.title = "";
}

function saveEdit() {
  const { id, ...data } = editingIssue;
  if (id) updateIssue(id, data);
  closeIssueEdit();
}

function updateIssueStatus(issue: Issue) {
  const status = issue.status === "todo" ? "doing" : issue.status === "doing" ? "done" : "todo";
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
      <!-- Header (Linear-like) -->
      <div class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b pl-3 pr-6 py-2">
        <div class="grid grid-cols-[16px_88px_1fr_100px_100px_110px_32px] gap-x-4 items-center">
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

      <!-- List -->
      <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style="scrollbar-gutter: stable">
        <div ref="itemsContainer" class="divide-y">
          <div
            v-for="{ id, issue } of backlogItems"
            :key="issue.id"
            class="group grid grid-cols-[16px_88px_1fr_100px_100px_110px_32px] gap-x-4 items-center px-3 py-2 hover:bg-zinc-50"
            :class="cn({ 'opacity-70': draggingId === id })"
          >
            <!-- Drag handle (only useful in manual order) -->
            <div
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              :class="cn(orderBy !== 'manual' && 'opacity-0')"
              title="Drag to reorder"
            >
              <Icon name="bi-grip-vertical" class="text-muted-foreground" />
            </div>

            <!-- Status + key -->
            <div class="flex items-center gap-2 min-w-0">
              <button
                class="w-2.5 h-2.5 rounded-full ring-1 ring-border"
                :class="issueStatusDotClass(issue.status)"
                :title="issue.status"
                @click="updateIssueStatus(issue)"
              />
              <span class="text-xs text-muted-foreground tabular-nums shrink-0"> EP-{{ issue.id }} </span>
            </div>

            <!-- Title (Linear-like) -->
            <div class="min-w-0">
              <div v-if="editingIssue.id !== issue.id" class="flex items-center gap-2 min-w-0">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <div class="min-w-0 flex-1" @dblclick.stop="openIssue(issue)">
                      <div class="truncate text-sm text-foreground">
                        {{ issue.title }}
                      </div>
                      <div v-if="issue.description" class="truncate text-xs text-muted-foreground">
                        {{ issue.description }}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {{ issue.title }}
                  </TooltipContent>
                </Tooltip>
                <Icon
                  name="fa-regular-edit"
                  @click="openIssueEdit(issue)"
                  class="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  title="Edit title"
                />
              </div>

              <Form v-else @submit="saveEdit" class="flex:row-md flex:center-y">
                <Field v-model="editingIssue.title" size="badge" name="title" />
                <Button type="submit" size="badge">Save</Button>
                <Button type="button" size="badge" @click="closeIssueEdit()">Cancel</Button>
              </Form>
            </div>

            <!-- Priority -->
            <div class="justify-self-start">
              <PriorityToggler
                :value="issue.priority"
                @update:value="updateIssue(issue.id, { priority: $event })"
              />
            </div>

            <!-- Assignees -->
            <UserSelect @update:model-value="$event && addAssignee(issue.id, $event.id)">
              <template #trigger>
                <div class="flex items-center justify-start">
                  <div class="flex items-center">
                    <img
                      v-for="(assignee, i) of issue.assignees"
                      :key="assignee.id"
                      :src="assignee.picture"
                      class="cursor-pointer w-5 h-5 rounded-full border border-background"
                      :class="cn(i > 0 && 'ml-[-0.45rem]')"
                    />
                  </div>
                  <div
                    v-if="issue.assignees.length === 0"
                    class="ml-1 flex flex:center w-fit p-0.5 cursor-pointer border-2 border-dashed border-secondary-foreground/30 rounded-full group/assignee hover:border-secondary-foreground/60"
                    title="Add assignee"
                  >
                    <Icon
                      name="fa-user-plus"
                      class="w-4 h-4 text-secondary-foreground/70 group-hover/assignee:text-secondary-foreground"
                    />
                  </div>
                </div>
              </template>
            </UserSelect>

            <!-- Due date -->
            <div class="justify-self-start">
              <DueDatePicker
                size="badge"
                :modelValue="issue.dueDate ? parseAbsolute(issue.dueDate, 'America/Sao_Paulo') : undefined"
                @update:model-value="
                  updateIssue(issue.id, { dueDate: $event?.toDate('America/Sao_Paulo').toString() })
                "
              />
            </div>

            <!-- Actions (hover only) -->
            <div class="justify-self-end">
              <Trash2Icon
                @click="removeBacklogItem(id)"
                class="h-4 w-4 cursor-pointer text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
                title="Remove"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
