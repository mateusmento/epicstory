<script setup lang="ts">
import { useWorkspace } from "@/domain/workspace";
import { RouterView } from "vue-router";
import Channels from "./channels/Channels.vue";
import { AppLayout, AppPaneContent, NavbarContent } from "./layout";
import Projects from "./projects/Projects.vue";
import SwitchWorkspaceNavbar from "./SwitchWorkspaceNavbar.vue";
import { Teams } from "./teams";
import WorkspaceMembers from "./workspace-members/WorkspaceMembers.vue";
import WorkspaceNavbar from "./WorkspaceNavbar.vue";
import Workspaces from "./workspaces/Workspaces.vue";

const { workspace } = useWorkspace();
</script>

<template>
  <AppLayout>
    <template #navbar="{ isAppPaneOpen }">
      <NavbarContent content="workspace">
        <WorkspaceNavbar :is-app-sidebar-open="isAppPaneOpen" />
      </NavbarContent>
      <NavbarContent content="switch-workspace">
        <SwitchWorkspaceNavbar v-model:current-workspace="workspace" />
      </NavbarContent>
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
