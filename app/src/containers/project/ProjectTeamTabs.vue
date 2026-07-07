<script setup lang="ts">
import { useProjectTeamTabs, type ProjectTeamView } from "@/domain/project/composables/project-team-tabs";
import { ProjectTeamTabBar } from "@/presentationals/project";
import { computed, toRef } from "vue";

const props = defineProps<{
  workspaceId: number;
  projectId: number;
  teamId: number | undefined;
  view: ProjectTeamView | undefined;
}>();

const { showTabs, tabs, activeProjectId, showMoreMenu, overflowTabs, loading, onMoreMenuOpen } =
  useProjectTeamTabs({
    workspaceId: toRef(props, "workspaceId"),
    projectId: toRef(props, "projectId"),
    teamId: computed(() => props.teamId),
    view: toRef(props, "view"),
  });
</script>

<template>
  <ProjectTeamTabBar
    v-if="showTabs"
    :tabs="tabs"
    :active-project-id="activeProjectId"
    :show-more-menu="showMoreMenu"
    :overflow-tabs="overflowTabs"
    :overflow-loading="loading"
    @more-menu-open="onMoreMenuOpen"
  />
</template>
