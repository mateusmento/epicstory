<script lang="ts" setup>
import { Button, Field, Form } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useIssues, type Issue } from "@/domain/issues";
import { parseAbsolute } from "@internationalized/date";
import { onMounted, reactive, watch } from "vue";
import { DueDatePicker } from "./date-picker";

const props = defineProps<{ projectId: string }>();

const { issues, fetchIssues, createIssue, updateIssue, removeIssue } = useIssues();

onMounted(() => {
  fetchIssues(+props.projectId, 0, 10);
});

watch(
  () => props.projectId,
  () => {
    fetchIssues(+props.projectId, 0, 10);
  },
);

const edittingIssue = reactive<{
  id: number | null;
  title: string;
}>({ id: null, title: "" });

function openIssueEdit(issue: Issue) {
  edittingIssue.id = issue.id;
  edittingIssue.title = issue.title;
}

function closeIssueEdit() {
  edittingIssue.id = null;
  edittingIssue.title = "";
}

function saveEdit() {
  const { id, ...data } = edittingIssue;
  if (id) updateIssue(id, data);
  closeIssueEdit();
}

function updateIssueStatus(issue: Issue) {
  const status = issue.status === "todo" ? "doing" : issue.status === "doing" ? "done" : "todo";
  updateIssue(issue.id, { status });
}
</script>

<template>
  <div class="flex:rows-xl flex:center-y m-auto p-4 w-[40rem] h-full">
    <h2 class="text-lg font-semibold">Issues</h2>

    <div class="flex:rows-md">
      <div v-for="issue of issues" :key="issue.id" class="flex:cols-md flex:center-y">
        <Button variant="outline" size="badge" @click="updateIssueStatus(issue)">{{ issue.status }}</Button>
        <div v-if="edittingIssue.id !== issue.id" @dblclick="openIssueEdit(issue)" class="text-sm">
          {{ issue.title }}
        </div>
        <Form v-else @submit="saveEdit" class="flex:cols-md flex:center-y">
          <Field v-model="edittingIssue.title" size="badge" name="title" />
          <Button type="submit" size="badge">Save</Button>
          <Button size="badge">Cancel</Button>
        </Form>
        <div class="self:fill"></div>
        <div class="rounded-full border border-2 border-dashed flex flex:center p-0.5 cursor-pointer">
          <Icon name="fa-user-plus" class="w-4 h-4 text-zinc-400" />
        </div>
        <DueDatePicker
          size="badge"
          :modelValue="issue.dueDate ? parseAbsolute(issue.dueDate, 'America/Sao_Paulo') : undefined"
          @update:model-value="updateIssue(issue.id, { dueDate: $event.toString() })"
        />
        <Icon name="io-trash-bin" @click="removeIssue(issue.id)" class="cursor-pointer text-zinc-800" />
      </div>
    </div>

    <Form @submit="createIssue(+projectId, $event.title)" class="flex:cols-md">
      <Field name="title" size="xs" placeholder="Describe an issue..." class="flex-1" />
      <Button type="submit" size="xs">Add</Button>
    </Form>
  </div>
</template>
