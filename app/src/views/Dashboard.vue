<script setup lang="ts">
import { Channels, Inbox, Issues, Projects, Teams, WorkspaceMembers } from "@/components/app-pane";
import { AppLayout, AppPaneContent, NavbarContent } from "@/components/layout";
import { SwitchWorkspaceNavbar, WorkspaceNavbar } from "@/components/navbar";
import { useWorkspace } from "@/domain/workspace";
import { RouterView } from "vue-router";

const { workspace } = useWorkspace();
</script>

<template>
  <AppLayout>
    <template #navbar="{ isAppPaneOpen }">
      <NavbarContent content="workspace">
        <WorkspaceNavbar :isAppPaneOpen="isAppPaneOpen" />
      </NavbarContent>
      <NavbarContent content="switch-workspace">
        <SwitchWorkspaceNavbar v-model:current-workspace="workspace" />
      </NavbarContent>
    </template>

    <template #app-pane>
      <AppPaneContent content="inbox">
        <Inbox />
      </AppPaneContent>
      <AppPaneContent content="issues">
        <Issues />
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
