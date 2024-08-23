<script setup lang="ts">
import { UpdateUser, UserProfile } from "@/components/user";
import { Button, Dialog, DialogContent, DialogTrigger, NavTrigger } from "@/design-system";
import { Icon, IconLeftCollapse } from "@/design-system/icons";
import { useWorkspace } from "@/domain/workspace";
import NavListItem from "./NavListItem.vue";
import { useAuth } from "@/domain/auth";

defineProps<{ isAppPaneOpen: boolean }>();

const { user } = useAuth();
const { workspace } = useWorkspace();
</script>

<template>
  <div class="flex:rows-xl h-full text-zinc-500">
    <div class="flex:cols-md items-start p-2 w-full cursor-pointer">
      <div class="flex:rows-sm mr-auto">
        <div class="pl-1 text-xs text-zinc-500">Workspace</div>
        <div class="flex:cols-lg flex:center-y">
          <NavTrigger
            view="app-pane"
            content="workspaces"
            :as="Button"
            variant="ghost"
            size="badge"
            class="rounded-md text-base text-neutral-800 font-normal whitespace-nowrap text-ellipsis overflow-hidden hover:bg-zinc-200/60"
          >
            {{ workspace?.name }}
          </NavTrigger>
          <NavTrigger view="navbar" content="switch-workspace" :as="Button" variant="outline" size="badge">
            Switch
          </NavTrigger>
        </div>
      </div>

      <NavTrigger view="navbar" content="notifications" :as="Button" variant="ghost" size="icon">
        <Icon name="io-notifications" />
      </NavTrigger>

      <NavTrigger view="navbar" content="settings" :as="Button" variant="ghost" size="icon">
        <Icon name="md-settings-round" />
      </NavTrigger>

      <!-- <IconLeftCollapse :class="{ 'scale-x-[-1]': !isAppPaneOpen }" /> -->
    </div>

    <nav class="flex:rows-md font-semibold">
      <NavListItem view="app-pane" content="projects" class="flex:cols-md flex:center-y">
        <Icon name="hi-clipboard-list" />
        Projects
      </NavListItem>
      <NavListItem view="app-pane" content="channels" class="flex:cols-md flex:center-y">
        <Icon name="fa-slack-hash" />
        Channels
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

    <Dialog>
      <DialogTrigger as-child>
        <UserProfile />
      </DialogTrigger>
      <DialogContent>
        <UpdateUser />
      </DialogContent>
    </Dialog>
  </div>
</template>
