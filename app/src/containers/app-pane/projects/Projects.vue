<script setup lang="ts">
import { cn } from "@/design-system/utils.js";
import CreateProjectDialog from "./CreateProjectDialog.vue";
import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  ScrollArea,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system";
import { useWorkspace } from "@/domain/workspace";
import { BoxIcon, MonitorCogIcon, Settings2, SquarePen, Trash2Icon } from "lucide-vue-next";
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
        <MonitorCogIcon class="size-4" stroke-width="2.5" />
        <div class="font-medium">Projects</div>
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
      <div class="!flex flex-col gap-1 p-2 min-h-0">
        <Menu v-for="project of projects" :key="project.id" type="context-menu">
          <MenuTrigger as-child>
            <RouterLink
              :to="`/${workspace.id}/project/${project.id}/backlog`"
              :class="
                cn(
                  'srf flex:row-md flex:center-y p-2 rounded-lg cursor-pointer',
                  +route.params.projectId === project.id
                    ? 'srf-soft srf-primary'
                    : 'srf-ghost srf-default srf--hover',
                )
              "
              class="flex:row-md flex:center-y"
            >
              <BoxIcon class="size-4" stroke-width="2" />
              <em class="flex-1 truncate">{{ project.name }}</em>
              <small>{{ project.issueCount }} issues</small>
            </RouterLink>
          </MenuTrigger>
          <MenuContent>
            <MenuItem>
              <SquarePen class="size-4" />
              Rename project
            </MenuItem>
            <MenuItem>
              <Settings2 class="size-4" />
              Edit project
            </MenuItem>
            <MenuSeparator />
            <MenuItem intent="destructive" @click="removeProject(project.id)">
              <Trash2Icon class="size-4" />
              Remove project
            </MenuItem>
          </MenuContent>
        </Menu>

        <small v-if="projectsPage?.hasNext" class="py-2 px-3">
          {{ isFetchingMoreProjects ? "Loading more…" : "Scroll to load more" }}
        </small>
      </div>
    </ScrollArea>
  </div>
</template>
