<script setup lang="ts">
import { Button, DialogTitle, Field, Form } from "@/design-system";
import { useBacklog } from "@/domain/backlog";

const props = defineProps<{
  projectId: number;
}>();

const { backlogItems, createBacklogItem } = useBacklog();

function onCreateBacklogItem(data: any) {
  console.log(backlogItems.value.length);
  createBacklogItem(props.projectId, {
    ...data,
    afterOf: backlogItems.value.length > 0 ? backlogItems.value[backlogItems.value.length - 1].id : undefined,
  });
}
</script>

<template>
  <div class="rounded-lg border shadow-md p-0 top-80 h-fit md:min-w-[450px]">
    <DialogTitle>New issue</DialogTitle>

    <Form @submit="onCreateBacklogItem($event as any)" class="flex:col-lg">
      <Field label="Title" name="title" placeholder="Enter the title of the issue" />
      <Field label="Description" name="description" placeholder="Enter the description of the issue" />
      <Button type="submit" size="xs">Create</Button>
    </Form>
  </div>
</template>
