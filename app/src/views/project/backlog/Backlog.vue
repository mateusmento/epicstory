<script lang="ts" setup>
import { Button, Field, Form } from "@/design-system";
import { useIssues } from "@/domain/issues";
import { onMounted } from "vue";

const props = defineProps<{ projectId: string }>();

const { issues, fetchIssues, createIssue } = useIssues();

onMounted(() => {
  fetchIssues(+props.projectId, 0, 10);
});
</script>

<template>
  <div class="p-4">
    <h2>Issues</h2>
    <div class="flex:rows-md">
      <div v-for="issue of issues" :key="issue.id">{{ issue.title }}</div>
    </div>
    <Form @submit="createIssue(+projectId, $event.title)">
      <Field size="sm" name="title" />
      <Button type="submit" size="xs">Create</Button>
    </Form>
  </div>
</template>
