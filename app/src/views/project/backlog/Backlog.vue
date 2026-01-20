<script lang="tsx" setup>
import { useDependency } from "@/core/dependency-injection";
import { Button, Combobox, Field, Form } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import type { User } from "@/domain/auth";
import { useBacklog, type BacklogItem } from "@/domain/backlog";
import { type Issue } from "@/domain/issues";
import { ProjectApi } from "@/domain/project";
import { useUsers } from "@/domain/user";
import { dragAndDrop } from "@formkit/drag-and-drop/vue";
import {
  animations,
  type DragstartEvent,
  type NodeRecord,
  type ParentDragEventData,
} from "@formkit/drag-and-drop";
import { parseAbsolute } from "@internationalized/date";
import { useStorage } from "@vueuse/core";
import { debounce } from "lodash";
import { onMounted, reactive, ref, watch, withModifiers, type FunctionalComponent as FC } from "vue";
import { DueDatePicker } from "./date-picker";
import { PriorityToggler } from "./priority-toggler";
import { Drawer, DrawerContent } from "@/design-system/ui/drawer";
import { UserSelect } from "@/components/user";
import { Trash2Icon } from "lucide-vue-next";

const props = defineProps<{ workspaceId: string; projectId: string }>();

const {
  backlogItems,
  fetchBacklogItems,
  createBacklogItem,
  removeBacklogItem,
  moveBacklogItem,
  updateIssue,
  addAssignee,
} = useBacklog();

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
        backlogId: backlogId.value,
        afterOf,
      });
    },
  });
}

watch(orderBy, setupDragAndDrop);

const projectApi = useDependency(ProjectApi);

const backlogId = ref<number>(0);

onMounted(async () => {
  const project = await projectApi.findProject(+props.projectId);
  backlogId.value = project.backlogId;
  await fetchBacklogItems({
    backlogId: backlogId.value,
    order: order.value,
    orderBy: orderBy.value,
    page: 0,
    count: 50,
  });

  setupDragAndDrop();
});

watch(
  () => [props.projectId, orderBy.value, order.value],
  async () => {
    const project = await projectApi.findProject(+props.projectId);
    backlogId.value = project.backlogId;
    fetchBacklogItems({
      backlogId: backlogId.value,
      order: order.value,
      orderBy: orderBy.value,
      page: 0,
      count: 50,
    });
  },
);

function onCreateBacklogItem(data: any) {
  createBacklogItem(backlogId.value, {
    ...data,
    backlogId: backlogId.value,
    projectId: +props.projectId,
    afterOf: backlogItems.value.length > 0 ? backlogItems.value[backlogItems.value.length - 1].id : undefined,
  });
}

const { users, fetchUsers } = useUsers();
const query = ref("");
const selectedUser = ref<User>();
watch(query, () => fetchUsers(query.value));

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

const showIssueDrawer = ref(false);
const issue = ref<Issue>();

function openIssue(iss: Issue) {
  issue.value = iss;
  showIssueDrawer.value = true;
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
  <Drawer v-model:open="showIssueDrawer" direction="right">
    <DrawerContent v-if="issue" class="flex:col-2xl p-6 m-2 min-w-96">
      <div class="text-foreground font-semibold text-lg">{{ issue.title }}</div>
      <div class="grid grid-cols-[1fr_1fr] gap-6">
        <div class="flex:col-md">
          <div class="text-secondary-foreground text-xs">Status</div>
          <div class="capitalize font-semibold">{{ issue.status }}</div>
        </div>
        <div class="flex:col-md items-end">
          <div class="text-secondary-foreground text-xs">Assignees</div>
          <div class="flex:row-md">
            <img
              v-for="assignee of issue.assignees"
              :key="assignee.id"
              :src="assignee.picture"
              class="w-6 h-6 rounded-full [&:not(:first-child)]:-ml-4"
            />
          </div>
        </div>
        <div class="flex:col-md">
          <div class="text-secondary-foreground text-xs">Priority</div>
          <PriorityToggler class="w-fit" />
        </div>
      </div>
    </DrawerContent>
  </Drawer>

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
            class="group grid grid-cols-subgrid col-span-6 gap-x-6 items-center py-1 px-2 border rounded-sm bg-white shadow-sm"
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
              class="flex:row-lg flex:center-y text-sm"
              :class="cn({ 'opacity-0': draggingId === id })"
            >
              <div
                @click.ctrl="openIssue(issue)"
                @dblclick.stop="$router.push(`/${workspaceId}/project/${projectId}/issue/${issue.id}`)"
              >
                {{ issue.title }}
              </div>
              <Icon
                name="fa-regular-edit"
                @click="openIssueEdit(issue)"
                class="opacity-0 group-hover:opacity-100 transition-opacity"
              />
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
            <div class="flex:row flex:center-y">
              <img
                v-for="(assignee, i) of issue.assignees"
                :key="assignee.id"
                :src="assignee.picture"
                :class="cn('w-5 h-5 rounded-full', i > 0 && 'ml-[-0.5rem]')"
              />
              <UserSelect
                v-model="selectedUser"
                @update:model-value="
                  selectedUser && addAssignee(issue.id, selectedUser.id);
                  selectedUser = undefined;
                "
              >
                <template #trigger>
                  <div
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
                </template>
              </UserSelect>
            </div>
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

    <Form @submit="onCreateBacklogItem" class="flex:row-md">
      <Field name="title" size="xs" placeholder="Describe an issue..." class="flex-1" />
      <Button type="submit" size="xs">Add</Button>
    </Form>
  </div>
</template>
