<script setup lang="ts">
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Field, Form } from "@/design-system";
import { Icon, IconSearch } from "@/design-system/icons";
import { useWorkspace } from "@/domain/workspace";
import { Trash2Icon } from "lucide-vue-next";
import { onMounted, watch } from "vue";
import { RouterLink } from "vue-router";

const { workspace, projects, createProject, fetchProjects, removeProject } = useWorkspace();

onMounted(async () => {
  fetchProjects();
});

watch(workspace, fetchProjects);
</script>

<template>
  <div class="flex:col w-96">
    <div class="flex:col-xl p-4">
      <Collapsible as-child>
        <div class="flex:row-auto flex:center-y">
          <h1 class="flex:row-md flex:center-y">
            <Icon name="hi-clipboard-list" />
            <div class="text-lg">Projects</div>
          </h1>

          <CollapsibleTrigger as-child>
            <Button variant="outline" size="badge" class="ml-auto">Create</Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <Form @submit="createProject($event as any)" class="flex:col-lg">
            <Field label="Name" name="name" placeholder="Create a project..." />
            <!-- <Field type="hidden" name="workspaceId" :value="workspace.id" /> -->
            <Button size="xs">Create</Button>
          </Form>
        </CollapsibleContent>
      </Collapsible>

      <div
        class="flex:row-md flex:center-y flex:center-x p-2 rounded-lg bg-secondary text-secondary-foreground text-sm"
      >
        <IconSearch /> Search
      </div>
    </div>

    <div class="flex:col">
      <RouterLink
        v-for="project of projects"
        :key="project.id"
        :to="`/${workspace.id}/project/${project.id}/backlog`"
        class="flex:row-auto flex:center-y p-4 border-t hover:bg-secondary cursor-pointer"
      >
        <div class="flex:col-md">
          <div class="text-base text-foreground font-dmSans font-medium">{{ project.name }}</div>
          <div class="text-xs text-secondary-foreground">4 members</div>
        </div>
        <Trash2Icon
          @click="removeProject(project.id)"
          class="h-4 w-4 mr-2 ml-auto cursor-pointer text-foreground"
        />
      </RouterLink>
    </div>
  </div>
</template>
