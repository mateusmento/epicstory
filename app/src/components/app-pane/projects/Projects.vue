<script setup lang="ts">
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Field, Form } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useWorkspace, type Workspace } from "@/domain/workspace";
import { onMounted, watch } from "vue";
import { RouterLink } from "vue-router";

const props = defineProps<{
  workspace: Workspace;
}>();

const { projects, createProject, fetchProjects, removeProject } = useWorkspace();

onMounted(async () => {
  fetchProjects();
});

watch(
  () => props.workspace,
  () => fetchProjects(),
);
</script>

<template>
  <div class="flex:col w-96">
    <div class="flex:col-xl p-4">
      <Collapsible as-child>
        <div class="flex:row-auto flex:center-y">
          <h1 class="flex:row-md flex:center-y">
            <Icon name="hi-clipboard-list" />
            <div class="text-lg font-medium">Projects</div>
          </h1>

          <CollapsibleTrigger as-child>
            <Button variant="outline" size="badge" class="ml-auto">Create</Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <Form @submit="createProject($event as any)" class="flex:col-lg">
            <Field label="Name" name="name" placeholder="Create a project..." />
            <Field type="hidden" name="workspaceId" :value="workspace.id" />
            <Button size="xs">Create</Button>
          </Form>
        </CollapsibleContent>
      </Collapsible>
    </div>

    <div class="flex:col">
      <RouterLink
        v-for="project of projects"
        :key="project.id"
        :to="`/project/${project.id}/backlog`"
        class="flex:row-auto flex:center-y p-4 border-t hover:bg-secondary cursor-pointer"
      >
        <div class="flex:col-md">
          <div class="text-base text-foreground font-dmSans font-medium">{{ project.name }}</div>
          <div class="text-xs text-secondary-foreground">4 members</div>
        </div>
        <Icon name="io-trash-bin" @click="removeProject(project.id)" class="cursor-pointer text-foreground" />
      </RouterLink>
    </div>
  </div>
</template>
