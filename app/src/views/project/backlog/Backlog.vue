<script lang="ts" setup>
import { useDependency } from "@/core/dependency-injection";
import { Button, Combobox, Field, Form } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/design-system/ui/select";
import { cn } from "@/design-system/utils";
import type { User } from "@/domain/auth";
import { useBacklog } from "@/domain/backlog";
import { type Issue } from "@/domain/issues";
import { ProjectService } from "@/domain/project";
import { useUsers } from "@/domain/user";
import { dragAndDrop } from "@formkit/drag-and-drop/vue";
import { parseAbsolute } from "@internationalized/date";
import { useStorage } from "@vueuse/core";
import { debounce } from "lodash";
import { onMounted, reactive, ref, watch } from "vue";
import { DueDatePicker } from "./date-picker";
import { PriorityToggler } from "./priority-toggler";

const props = defineProps<{ projectId: string }>();

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
const order = useStorage("backlog.order", "asc");

function toggleOrder() {
  order.value = order.value === "asc" ? "desc" : "asc";
}

const onMoveBacklogItem = debounce(moveBacklogItem, 500, { leading: false });

const itemsContainer = ref<HTMLElement>();

onMounted(() => {
  dragAndDrop({
    parent: itemsContainer,
    values: backlogItems,
    async onSort({ draggedNode, position, values }) {
      const { id } = draggedNode.data.value as any;
      const { id: insertedAfterOfId } = (values[position - 1] as any) ?? {};
      onMoveBacklogItem(
        id,
        {
          backlogId: backlogId.value,
          insertedAfterOfId,
        },
        () => {
          fetchBacklogItems({
            backlogId: backlogId.value,
            order: order.value,
            orderBy: orderBy.value,
            page: 0,
            count: 50,
          });
        },
      );
    },
  });
});

const projectApi = useDependency(ProjectService);

const backlogId = ref<number>(0);

onMounted(async () => {
  const project = await projectApi.findProject(+props.projectId);
  backlogId.value = project.backlogId;
  fetchBacklogItems({
    backlogId: backlogId.value,
    order: order.value,
    orderBy: orderBy.value,
    page: 0,
    count: 50,
  });
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
    insertedAfterOfId:
      backlogItems.value.length > 0 ? backlogItems.value[backlogItems.value.length - 1].id : undefined,
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
</script>

<template>
  <div class="flex:rows-xl m-auto py-8 px-12 w-full h-full">
    <div class="flex:cols-auto">
      <h2 class="text-lg font-semibold">Issues</h2>
      <Select v-model="orderBy">
        <SelectTrigger class="w-36">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="priority">Priority</SelectItem>
          <SelectItem value="createdAt">Create date</SelectItem>
          <SelectItem value="manual">Manual</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div
      class="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] grid-rows-[auto_1fr] gap-y-4 flex-1 min-h-0"
    >
      <div class="grid grid-cols-subgrid col-span-7 gap-x-6">
        <div>Status</div>
        <div>Title</div>
        <div
          @click="
            // orderBy = 'priority';
            toggleOrder()
          "
        >
          Priority
        </div>
        <div class="col-span-2">Assignees</div>
        <div class="col-span-2">Due date</div>
      </div>
      <div
        class="grid grid-cols-subgrid col-span-7 pr-2 overflow-y-auto overflow-x-hidden"
        style="scrollbar-gutter: stable"
      >
        <div class="grid grid-cols-subgrid auto-rows-max col-span-7 gap-y-1" ref="itemsContainer">
          <div
            v-for="{ id, issue, previousId, nextId, order } of backlogItems"
            :key="issue.id"
            class="grid grid-cols-subgrid col-span-7 gap-x-6 items-center py-1 px-2 border rounded-sm bg-white"
          >
            <Button
              variant="outline"
              size="badge"
              @click="updateIssueStatus(issue)"
              :class="cn(issueStatusColor(issue.status))"
              >{{ issue.status }}</Button
            >
            <div v-if="editingIssue.id !== issue.id" @dblclick="openIssueEdit(issue)" class="text-sm">
              <RouterLink :to="`issue/${issue.id}`"
                >{{ issue.title }} {{ id }} previousId({{ previousId }}) nextId({{ nextId }})
                {{ order }}</RouterLink
              >
            </div>
            <Form v-else @submit="saveEdit" class="flex:cols-md flex:center-y">
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
            <div class="flex:cols">
              <img
                v-for="(assignee, i) of issue.assignees"
                :key="assignee.id"
                :src="assignee.picture"
                :class="cn('w-5 h-5 rounded-full', i > 0 && 'ml-[-0.5rem]')"
              />
            </div>
            <Combobox
              v-model="selectedUser"
              v-model:searchTerm="query"
              :options="users"
              track-by="id"
              label-by="name"
              @update:model-value="
                selectedUser && addAssignee(issue.id, selectedUser.id);
                selectedUser = undefined;
              "
            >
              <template #trigger>
                <div class="rounded-full border-2 border-dashed flex flex:center p-0.5 cursor-pointer">
                  <Icon name="fa-user-plus" class="w-4 h-4 text-zinc-400" />
                </div>
              </template>
            </Combobox>
            <DueDatePicker
              size="badge"
              :modelValue="issue.dueDate ? parseAbsolute(issue.dueDate, 'America/Sao_Paulo') : undefined"
              @update:model-value="
                updateIssue(issue.id, { dueDate: $event.toDate('America/Sao_Paulo').toString() })
              "
            />
            <Icon name="io-trash-bin" @click="removeBacklogItem(id)" class="cursor-pointer text-zinc-800" />
          </div>
        </div>
      </div>
    </div>

    <Form @submit="onCreateBacklogItem" class="flex:cols-md">
      <Field name="title" size="xs" placeholder="Describe an issue..." class="flex-1" />
      <Button type="submit" size="xs">Add</Button>
    </Form>
  </div>
</template>
