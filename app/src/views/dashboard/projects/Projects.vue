<script setup lang="ts">
import { Button, Field, Form } from "@/design-system";
import { useWorkspace, type Workspace } from "@/domain/workspace";
import { onMounted, watch } from "vue";

const props = defineProps<{
  workspace: Workspace;
}>();

const { projects, createProject, fetchProjects } = useWorkspace();

onMounted(async () => {
  fetchProjects();
});

watch(
  () => props.workspace,
  () => fetchProjects(),
);
</script>

<template>
  <div class="flex:rows-xl p-4">
    <h1 class="text-lg">Projects</h1>

    <div class="flex:rows-lg p-1 rounded-md bg-zinc-100 text-zinc-500 text-sm">
      <div
        v-for="project of projects"
        :key="project.id"
        class="px-2 py-1 rounded-sm hover:bg-zinc-200/60 cursor-pointer"
      >
        {{ project.name }}
      </div>
    </div>
    <Form @submit="createProject($event as any)" class="flex:rows-lg">
      <Field label="Name" name="name" placeholder="Create a project..." />
      <Field type="hidden" name="workspaceId" :value="workspace.id" />
      <Button size="xs">Create</Button>
    </Form>
  </div>
</template>
