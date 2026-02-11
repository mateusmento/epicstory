<script setup lang="ts">
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Field,
  Form,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useWorkspace } from "@/domain/workspace";
import { SquarePen, Trash2Icon } from "lucide-vue-next";
import { onMounted, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

const { workspace, projects, createProject, fetchProjects, removeProject } = useWorkspace();

const route = useRoute();

onMounted(async () => {
  fetchProjects();
});

watch(workspace, fetchProjects);
</script>

<template>
  <div class="flex:col w-96">
    <Collapsible as-child>
      <div class="flex:row-auto flex:center-y px-4 py-1.5 h-10">
        <h1 class="flex:row-md flex:center-y">
          <Icon name="hi-clipboard-list" />
          <div class="font-medium text-sm">Projects</div>
        </h1>


        <Tooltip>
          <TooltipTrigger as-child>
            <CollapsibleTrigger as-child>
              <Button variant="ghost" size="icon">
                <SquarePen class="w-4 h-4" />
              </Button>
            </CollapsibleTrigger>
          </TooltipTrigger>
          <TooltipContent> Create a new project </TooltipContent>
        </Tooltip>
      </div>

      <CollapsibleContent>
        <Form @submit="createProject($event as any)" class="flex:col-lg m-2 p-2 border rounded-lg">
          <Field label="Name" name="name" placeholder="Create a project..." />
          <!-- <Field type="hidden" name="workspaceId" :value="workspace.id" /> -->
          <Button size="xs">Create</Button>
        </Form>
      </CollapsibleContent>
    </Collapsible>

    <Separator />

    <div class="flex:col-md p-2">
      <RouterLink v-for="project of projects" :key="project.id" :to="`/${workspace.id}/project/${project.id}/backlog`"
        class="flex:row-2xl flex:center-y py-2 px-3 rounded-lg hover:bg-secondary cursor-pointer"
        :class="{ 'bg-secondary': +route.params.projectId === project.id }">
        <div class="flex:row-auto flex:center-y flex-1">
          <div class="text-sm text-foreground font-medium">{{ project.name }}</div>
          <div class="text-xs text-secondary-foreground">4 members</div>
        </div>
        <Trash2Icon @click="removeProject(project.id)" class="h-4 w-4 mr-2 ml-auto cursor-pointer text-foreground" />
      </RouterLink>
    </div>
  </div>
</template>
