<script setup lang="ts">
import { Issues } from "@/presentationals/app-pane/issues";
import {
  ChannelDetailsPane,
  Channels,
  Inbox,
  Projects,
  Team,
  Teams,
  WorkspaceMembers,
} from "@/containers/app-pane";
import ThreadDrawer from "@/containers/channel/ThreadDrawer.vue";
import { ConfirmDialogProvider } from "@/containers/confirm-dialog";
import { AppLayout, DrawerPaneContent, NavbarContent } from "@/presentationals/layout";
import { SettingsNavbar, SwitchWorkspaceNavbar, WorkspaceNavbar } from "@/containers/navbar";
import { NotFoundException, UnauthorizedException } from "@/core/axios";
import { useWorkspacePresence } from "@/domain/channels";
import { useNotificationIncomingAlerts, useNotifications } from "@/domain/notifications";
import { useWorkspace } from "@/domain/workspace";
import { computed, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const openPane = ref<string>();

const isAppPaneOpen = computed({
  get: () => openPane.value === "app-pane",
  set: (value) => (openPane.value = value ? "app-pane" : undefined),
});

const isDetailsPaneOpen = computed({
  get: () => openPane.value === "details-pane",
  set: (value) => (openPane.value = value ? "details-pane" : undefined),
});

const workspaceId = computed(() => +route.params.workspaceId);

const { fetchWorkspace } = useWorkspace();

useNotifications({ manageConnection: true, pageSize: 100 });
useNotificationIncomingAlerts();
useWorkspacePresence();

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
  <ConfirmDialogProvider>
    <AppLayout v-model:isAppPaneOpen="isAppPaneOpen" v-model:isDetailsPaneOpen="isDetailsPaneOpen">
      <template #navbar="{ isAppPaneOpen }">
        <NavbarContent content="workspace">
          <WorkspaceNavbar :isAppPaneOpen="isAppPaneOpen" />
        </NavbarContent>
        <NavbarContent content="switch-workspace" :as="SwitchWorkspaceNavbar" />
        <NavbarContent content="settings" :as="SettingsNavbar" />
      </template>

      <template #topbar>
        <div class="my-2"></div>
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
        <DrawerPaneContent content="channel">
          <ChannelDetailsPane @close="isDetailsPaneOpen = false" />
        </DrawerPaneContent>
        <DrawerPaneContent content="replies" #default="{ contentProps }">
          <ThreadDrawer
            v-model:message="contentProps.message"
            :meId="contentProps.meId"
            @close="isDetailsPaneOpen = false"
          />
        </DrawerPaneContent>
      </template>
    </AppLayout>
  </ConfirmDialogProvider>
</template>

<style lang="scss" scoped></style>
