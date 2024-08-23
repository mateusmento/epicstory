<script setup lang="ts">
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Field, Form } from "@/design-system";
import { Icon } from "@/design-system/icons";
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
    <Collapsible as-child>
      <div class="flex:cols-auto flex:center-y">
        <h1 class="flex:cols-md flex:center-y text-lg">
          <Icon name="hi-clipboard-list" />
          <div>Projects</div>
        </h1>

        <CollapsibleTrigger as-child>
          <Button variant="outline" size="badge" class="ml-auto">Create</Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <Form @submit="createProject($event as any)" class="flex:rows-lg">
          <Field label="Name" name="name" placeholder="Create a project..." />
          <Field type="hidden" name="workspaceId" :value="workspace.id" />
          <Button size="xs">Create</Button>
        </Form>
      </CollapsibleContent>
    </Collapsible>

    <div class="flex:rows-lg p-1 rounded-md bg-zinc-100 text-zinc-500 text-sm">
      <div
        v-for="project of projects"
        :key="project.id"
        class="px-2 py-1 rounded-sm hover:bg-zinc-200/60 cursor-pointer"
      >
        {{ project.name }}
      </div>
    </div>
  </div>
</template>
