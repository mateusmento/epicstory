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

function issueStatusColor(status: string) {
  if (status === "doing") return "text-blue-600 border-blue-600 bg-blue-200";
  if (status === "done") return "text-green-600 border-green-600 bg-green-200";
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
  <div class="flex:col-xl m-auto py-8 px-12 w-full h-full">
    <div class="grid grid-cols-[auto_1fr_auto_auto_auto_auto] grid-rows-[auto_1fr] gap-y-4 flex-1 min-h-0">
      <div class="grid grid-cols-subgrid col-span-6 gap-x-6">
        <BacklogHeadCell
          label="Status"
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
        <div class="text-sm text-secondary-foreground select-none cursor-pointer flex:row-md flex:center-y">
          Assignees
        </div>
        <BacklogHeadCell
          label="Due Date"
          :show="orderBy === 'dueDate'"
          :order="order"
          @click="toggleOrder('dueDate')"
          @reset="resetOrder"
        />
      </div>
      <div
        class="grid grid-cols-subgrid col-span-6 pr-2 overflow-y-auto overflow-x-hidden"
        style="scrollbar-gutter: stable"
      >
        <div class="grid grid-cols-subgrid auto-rows-max col-span-6 gap-y-1" ref="itemsContainer">
          <div
            v-for="{ id, issue } of backlogItems"
            :key="issue.id"
            class="grid grid-cols-subgrid col-span-6 gap-x-6 items-center py-1 px-2 border rounded-sm bg-white shadow-sm"
          >
            <Button
              variant="outline"
              size="badge"
              @click="updateIssueStatus(issue)"
              :class="cn(issueStatusColor(issue.status), { 'opacity-0': draggingId === id })"
              >{{ issue.status }}</Button
            >
            <div
              v-if="editingIssue.id !== issue.id"
              class="group flex:row-lg flex:center-y text-sm min-w-0"
              :class="cn({ 'opacity-0': draggingId === id })"
            >
              <div class="flex:row-lg flex:center-y min-w-0">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <div @click.stop="openIssue(issue)" class="truncate min-w-0 flex-1">
                      {{ issue.title }}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {{ issue.title }}
                  </TooltipContent>
                </Tooltip>
                <Icon
                  name="fa-regular-edit"
                  @click="openIssueEdit(issue)"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
            <Form v-else @submit="saveEdit" class="flex:row-md flex:center-y">
              <Field v-model="editingIssue.title" size="badge" name="title" />
              <Button type="submit" size="badge">Save</Button>
              <Button type="button" size="badge" @click="closeIssueEdit()">Cancel</Button>
            </Form>
            <div>
              <PriorityToggler
                :value="issue.priority"
                @update:value="updateIssue(issue.id, { priority: $event })"
              />
            </div>
            <UserSelect @update:model-value="$event && addAssignee(issue.id, $event.id)">
              <template #trigger>
                <div class="flex:row flex:center-y w-fit">
                  <img
                    v-for="(assignee, i) of issue.assignees"
                    :key="assignee.id"
                    :src="assignee.picture"
                    class="cursor-pointer"
                    :class="cn('w-5 h-5 rounded-full', i > 0 && 'ml-[-0.5rem]')"
                  />
                  <div
                    v-if="issue.assignees.length === 0"
                    :class="
                      cn(
                        'flex flex:center w-fit p-0.5 mr-2 cursor-pointer border-2 border-dashed border-secondary-foreground/30 rounded-full group/assignee hover:border-secondary-foreground/60',
                        issue.assignees?.length > 0 && '-m-2',
                      )
                    "
                  >
                    <Icon
                      name="fa-user-plus"
                      class="w-4 h-4 text-secondary-foreground/70 group-hover/assignee:text-secondary-foreground"
                    />
                  </div>
                </div>
              </template>
            </UserSelect>
            <DueDatePicker
              size="badge"
              :modelValue="issue.dueDate ? parseAbsolute(issue.dueDate, 'America/Sao_Paulo') : undefined"
              @update:model-value="
                updateIssue(issue.id, { dueDate: $event?.toDate('America/Sao_Paulo').toString() })
              "
            />
            <Trash2Icon @click="removeBacklogItem(id)" class="mr-2 h-4 w-4 cursor-pointer text-foreground" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
