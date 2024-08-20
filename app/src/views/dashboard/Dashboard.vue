<script setup lang="ts">
import { useWorkspace } from "@/domain/workspace";
import { RouterView } from "vue-router";
import Channels from "./channels/Channels.vue";
import AppLayout from "./layout/AppLayout.vue";
import AppPaneContent from "./layout/app-pane/AppPaneContent.vue";
import NavigationSidebar from "./NavigationSidebar.vue";
import Projects from "./projects/Projects.vue";
import { Teams } from "./teams";
import WorkspaceMembers from "./workspace-members/WorkspaceMembers.vue";
import Workspaces from "./workspaces/Workspaces.vue";

const { workspace } = useWorkspace();
</script>

<template>
  <AppLayout>
    <template #nav-sidebar="{ isAppPaneOpen }">
      <NavigationSidebar :is-app-sidebar-open="isAppPaneOpen" />
    </template>

    <template #app-pane>
      <AppPaneContent content="workspaces">
        <Workspaces v-model:current-workspace="workspace" />
      </AppPaneContent>
      <AppPaneContent content="projects">
        <Projects v-if="workspace" :workspace="workspace" />
      </AppPaneContent>
      <AppPaneContent content="channels">
        <Channels />
      </AppPaneContent>
      <AppPaneContent content="teams">
        <Teams v-model:current-workspace="workspace" />
      </AppPaneContent>
      <AppPaneContent content="workspace-members">
        <WorkspaceMembers v-model:current-workspace="workspace" />
      </AppPaneContent>
    </template>

    <template #main-content>
      <RouterView />
    </template>
  </AppLayout>
</template>

<style lang="scss" scoped></style>
