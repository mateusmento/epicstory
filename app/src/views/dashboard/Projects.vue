<script setup lang="ts">
import { Button, Field, Form } from "@/design-system";
import { useProjects } from "@/domain/project/composables/projects";
import { type Workspace } from "@/domain/workspace";
import { onMounted, watch } from "vue";

const props = defineProps<{
  workspace: Workspace;
}>();

const { projects, createProject, fetchProjects } = useProjects(props.workspace.id);

onMounted(async () => {
  fetchProjects();
});

watch(
  () => props.workspace,
  () => fetchProjects(),
);
</script>

<template>
  <div class="flex:rows-sm px-1 rounded-sm font-normal">
    <div
      v-for="project of projects"
      :key="project.id"
      class="px-2 py-1 w-fit rounded-sm text-zinc-500 hover:font-semibold cursor-pointer"
    >
      {{ project.name }}
    </div>
    <Form @submit="createProject as any">
      <Field label="Name" name="name" placeholder="Create a project..." />
      <Field type="hidden" name="workspaceId" :value="workspace.id" />
      <Button>Create</Button>
    </Form>
  </div>
</template>
