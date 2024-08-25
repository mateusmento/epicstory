<script lang="ts" setup>
import { Button, Field, Form } from "@/design-system";
import { useIssues, type Issue } from "@/domain/issues";
import { onMounted, reactive, watch } from "vue";

const props = defineProps<{ projectId: string }>();

const { issues, fetchIssues, createIssue, updateIssue } = useIssues();

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

function saveEdit() {
  const { id, ...data } = edittingIssue;
  if (id) updateIssue(id, data);
  closeIssueEdit();
}

function closeIssueEdit() {
  edittingIssue.id = null;
  edittingIssue.title = "";
}

function updateIssueStatus(issue: Issue) {
  const status = issue.status === "todo" ? "doing" : issue.status === "doing" ? "done" : "todo";
  updateIssue(issue.id, { status });
}
</script>

<template>
  <div class="p-4">
    <h2 class="text-lg font-semibold">Issues</h2>
    <div class="flex:rows-md">
      <div v-for="issue of issues" :key="issue.id" class="flex:cols-md flex:center-y">
        <div v-if="edittingIssue.id !== issue.id" @dblclick="openIssueEdit(issue)" class="text-sm">
          {{ issue.title }}
        </div>
        <Form v-else @submit="saveEdit" class="flex:cols-md flex:center-y">
          <Field v-model="edittingIssue.title" size="badge" name="title" />
          <Button type="submit" size="badge">Save</Button>
          <Button size="badge">Cancel</Button>
        </Form>
        <Button variant="outline" size="badge" @click="updateIssueStatus(issue)">{{ issue.status }}</Button>
      </div>
    </div>
    <Form @submit="createIssue(+projectId, $event.title)" class="flex:cols-md mt-2">
      <Field name="title" size="xs" placeholder="Describe an issue..." />
      <Button type="submit" size="xs">Add</Button>
    </Form>
  </div>
</template>
