<script setup lang="ts">
import {
  ChannelDetailsPane,
  Channels,
  Inbox,
  Issues,
  Projects,
  Team,
  Teams,
  WorkspaceMembers,
} from "@/components/app-pane";
import { AppLayout, DrawerPaneContent, NavbarContent } from "@/components/layout";
import { SettingsNavbar, SwitchWorkspaceNavbar, WorkspaceNavbar } from "@/components/navbar";
import { NotFoundException, UnauthorizedException } from "@/core/axios";
import { useWorkspace } from "@/domain/workspace";
import { computed, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const workspaceId = computed(() => +route.params.workspaceId);

const { fetchWorkspace } = useWorkspace();

async function loadWorkspace() {
  try {
    await fetchWorkspace(workspaceId.value);
  } catch (err) {
    if (err instanceof UnauthorizedException || err instanceof NotFoundException) {
      router.push({ name: "select-workspace" });
      throw err;
    } else {
      throw err;
    }
  }
}

await loadWorkspace();
watch(workspaceId, loadWorkspace);
</script>

<template>
  <AppLayout>
    <template #navbar="{ isAppPaneOpen }">
      <NavbarContent content="workspace">
        <WorkspaceNavbar :isAppPaneOpen="isAppPaneOpen" />
      </NavbarContent>
      <NavbarContent content="switch-workspace" :as="SwitchWorkspaceNavbar" />
      <NavbarContent content="settings" :as="SettingsNavbar" />
    </template>

    <template #app-pane>
      <DrawerPaneContent content="inbox" :as="Inbox" />
      <DrawerPaneContent content="issues" :as="Issues" />
      <DrawerPaneContent content="projects" :as="Projects" />
      <DrawerPaneContent content="channels" :as="Channels" />
      <DrawerPaneContent content="teams" :as="Teams" />
      <DrawerPaneContent content="team" :as="Team" />
      <DrawerPaneContent content="workspace-members" :as="WorkspaceMembers" />
    </template>

    <template #main-content>
      <RouterView />
    </template>

    <template #details-pane>
      <DrawerPaneContent content="channel" :as="ChannelDetailsPane" />
    </template>
  </AppLayout>
</template>

<style lang="scss" scoped></style>
