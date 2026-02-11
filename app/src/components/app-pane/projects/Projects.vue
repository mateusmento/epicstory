<script setup lang="ts">
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Field,
  Form,
  Separator,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useWorkspace } from "@/domain/workspace";
import { Trash2Icon } from "lucide-vue-next";
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
      <div class="flex:row-auto flex:center-y px-4 py-2 h-14">
        <h1 class="flex:row-md flex:center-y">
          <Icon name="hi-clipboard-list" />
          <div class="font-semibold">Projects</div>
        </h1>

        <CollapsibleTrigger as-child>
          <Button variant="outline" size="badge" class="ml-auto">Create</Button>
        </CollapsibleTrigger>
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
      <RouterLink
        v-for="project of projects"
        :key="project.id"
        :to="`/${workspace.id}/project/${project.id}/backlog`"
        class="flex:row-2xl flex:center-y py-2 px-4 rounded-lg hover:bg-secondary cursor-pointer"
        :class="{ 'bg-secondary': +route.params.projectId === project.id }"
      >
        <div class="flex:row-auto flex:center-y flex-1">
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
