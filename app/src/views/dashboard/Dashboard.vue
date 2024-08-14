<script setup lang="ts">
import { useWorkspace } from "@/domain/workspace";
import Channels from "./channels/Channels.vue";
import Projects from "./projects/Projects.vue";
import { Teams } from "./teams";
import WorkspaceMembers from "./workspace-members/WorkspaceMembers.vue";
import Workspaces from "./workspaces/Workspaces.vue";
import AppSidebarContent from "./layout/AppSidebarContent.vue";
import AppLayout from "./layout/AppLayout.vue";
import NavigationSidebar from "./NavigationSidebar.vue";
import { RouterView } from "vue-router";

const { workspace } = useWorkspace();
</script>

<template>
  <AppLayout>
    <template #nav-sidebar="{ isAppSidebarOpen }">
      <NavigationSidebar :is-app-sidebar-open="isAppSidebarOpen" />
    </template>

    <template #app-sidebar>
      <AppSidebarContent name="workspaces">
        <Workspaces v-model:current-workspace="workspace" />
      </AppSidebarContent>
      <AppSidebarContent name="projects">
        <Projects v-if="workspace" :workspace="workspace" />
      </AppSidebarContent>
      <AppSidebarContent name="channels">
        <Channels />
      </AppSidebarContent>
      <AppSidebarContent name="teams">
        <Teams v-model:current-workspace="workspace" />
      </AppSidebarContent>
      <AppSidebarContent name="workspace-members">
        <WorkspaceMembers v-model:current-workspace="workspace" />
      </AppSidebarContent>
    </template>

    <template #main-section>
      <RouterView />
    </template>
  </AppLayout>
</template>

<style lang="scss" scoped></style>
