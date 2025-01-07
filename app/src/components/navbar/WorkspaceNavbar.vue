<script setup lang="ts">
import { UserProfile } from "@/components/user";
import { Button, NavTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useWorkspace } from "@/domain/workspace";
import { NavListItem } from "../layout";

defineProps<{ isAppPaneOpen: boolean }>();

const { workspace } = useWorkspace();
</script>

<template>
  <div class="flex:rows-xl h-full text-zinc-500">
    <div class="flex:rows-md p-2 w-full mr-auto">
      <div class="pl-1 text-xs text-zinc-500">Workspace</div>

      <div class="flex:cols-md flex:center-y w-full">
        <NavTrigger
          view="navbar"
          content="switch-workspace"
          :as="Button"
          variant="text"
          size="badge"
          class="block rounded-md text-base text-neutral-800 font-normal whitespace-nowrap text-ellipsis overflow-hidden hover:bg-zinc-200/60"
        >
          {{ workspace?.name }}
          <Icon name="oi-chevron-down" />
        </NavTrigger>

        <div class="self:fill"></div>

        <NavTrigger view="navbar" content="settings" :as="Button" variant="text" size="icon">
          <Icon name="md-settings-round" />
        </NavTrigger>
      </div>
    </div>

    <nav class="flex:rows-md font-semibold">
      <NavListItem view="app-pane" content="inbox" class="flex:cols-md flex:center-y">
        <Icon name="oi-inbox" />
        Inbox
      </NavListItem>
      <NavListItem view="app-pane" content="issues" class="flex:cols-md flex:center-y">
        <Icon name="oi-apps" />
        Issues
      </NavListItem>
      <NavListItem view="app-pane" content="channels" class="flex:cols-md flex:center-y">
        <Icon name="fa-slack-hash" />
        Channels
        <Icon name="bi-chevron-expand" class="ml-auto" />
      </NavListItem>
      <NavListItem view="app-pane" content="projects" class="flex:cols-md flex:center-y">
        <Icon name="hi-clipboard-list" />
        Projects
      </NavListItem>
      <NavListItem view="app-pane" content="teams" class="flex:cols-md flex:center-y">
        <Icon name="bi-person-workspace" />
        Teams
      </NavListItem>
      <NavListItem view="app-pane" content="workspace-members" class="flex:cols-md flex:center-y">
        <Icon name="bi-people-fill" />
        Members
      </NavListItem>
    </nav>

    <div class="self:fill"></div>

    <RouterLink to="/settings/user-account">
      <UserProfile />
    </RouterLink>
  </div>
</template>
