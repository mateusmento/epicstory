<script setup lang="ts">
import { AppLayout, DrawerPaneContent, NavbarContent } from "@/components/layout";
import { SettingsNavbar, SwitchWorkspaceNavbar, WorkspaceNavbar } from "@/components/navbar";
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
      <NavbarContent content="settings">
        <SettingsNavbar />
      </NavbarContent>
    </template>

    <template #app-pane>
      <DrawerPaneContent content="inbox">
        <Inbox />
      </DrawerPaneContent>
      <DrawerPaneContent content="issues">
        <Issues />
      </DrawerPaneContent>
      <DrawerPaneContent content="projects">
        <Projects v-if="workspace" :workspace="workspace" />
      </DrawerPaneContent>
      <DrawerPaneContent content="channels">
        <Channels />
      </DrawerPaneContent>
      <DrawerPaneContent content="teams">
        <Teams v-model:current-workspace="workspace" />
      </DrawerPaneContent>
      <DrawerPaneContent content="team" #default="{ contentProps }">
        <Team v-bind="contentProps" />
      </DrawerPaneContent>
      <DrawerPaneContent content="workspace-members">
        <WorkspaceMembers v-model:current-workspace="workspace" />
      </DrawerPaneContent>
    </template>

    <template #main-content>
      <RouterView />
    </template>
  </AppLayout>
</template>

<style lang="scss" scoped></style>
