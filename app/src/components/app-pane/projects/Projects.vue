<script setup lang="ts">
import CreateProjectDialog from "./CreateProjectDialog.vue";
import { Button, ScrollArea, Separator, Tooltip, TooltipContent, TooltipTrigger } from "@/design-system";
import { useWorkspace } from "@/domain/workspace";
import { BoxIcon, MonitorCogIcon, SquarePen, Trash2Icon } from "lucide-vue-next";
import { onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

const {
  workspace,
  projects,
  projectsPage,
  isFetchingMoreProjects,
  fetchMoreProjects,
  createProject,
  fetchProjects,
  removeProject,
} = useWorkspace();

const route = useRoute();
const createProjectDialogOpen = ref(false);

async function onCreateProjectSubmit(payload: { name: string; issueKeyPrefix?: string }) {
  await createProject(payload);
}

onMounted(async () => {
  fetchProjects({
    order: "asc",
    orderBy: "createdAt",
    page: 0,
    count: 50,
  });
});

watch(workspace, () =>
  fetchProjects({
    order: "asc",
    orderBy: "createdAt",
    page: 0,
    count: 50,
  }),
);
</script>

<template>
  <div class="flex flex-col w-96 h-full min-h-0">
    <div class="flex:row-auto flex:center-y px-4 py-1.5 h-10">
      <h1 class="flex:row-md flex:center-y">
        <MonitorCogIcon class="size-4 text-muted-foreground" stroke-width="2.5" />
        <div class="font-medium text-sm">Projects</div>
      </h1>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon" @click="createProjectDialogOpen = true">
            <SquarePen class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Create a new project</TooltipContent>
      </Tooltip>
    </div>

    <CreateProjectDialog v-model:open="createProjectDialogOpen" @submit="onCreateProjectSubmit" />

    <Separator />

    <ScrollArea @reached-bottom="fetchMoreProjects()" class="flex-1 min-h-0">
      <div class="!flex flex-col gap-1 p-2 min-h-0 font-inter">
        <RouterLink
          v-for="project of projects"
          :key="project.id"
          :to="`/${workspace.id}/project/${project.id}/backlog`"
          class="flex:row-2xl flex:center-y py-2 px-3 rounded-lg hover:bg-secondary cursor-pointer"
          :class="{ 'bg-secondary': +route.params.projectId === project.id }"
        >
          <div class="flex:row-md flex:center-y flex-1">
            <BoxIcon class="size-4 text-muted-foreground" stroke-width="2" />

            <div class="text-sm text-foreground flex-1 truncate">{{ project.name }}</div>
            <div class="text-xs text-secondary-foreground">{{ project.issueCount }} issues</div>
          </div>
          <Trash2Icon
            @click.stop.prevent="removeProject(project.id)"
            class="h-4 w-4 mr-2 ml-auto cursor-pointer text-foreground"
          />
        </RouterLink>

        <div v-if="projectsPage?.hasNext" class="py-2 px-3 text-xs text-secondary-foreground">
          {{ isFetchingMoreProjects ? "Loading more…" : "Scroll to load more" }}
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
