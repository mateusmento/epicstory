<script setup lang="ts">
import { UpdateUser } from "@/components/user";
import { Button, Dialog, DialogContent, DialogTrigger, NavTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useWorkspace } from "@/domain/workspace";
import NavListItem from "./NavListItem.vue";

defineProps<{ isAppPaneOpen: boolean }>();

const { user } = useAuth();
const { workspace } = useWorkspace();
</script>

<template>
  <div class="flex:rows-xl h-full text-zinc-500">
    <div class="flex:rows-sm p-2 w-full mr-auto">
      <div class="flex:cols flex:center-y">
        <div class="pl-1 text-xs text-zinc-500">Workspace</div>

        <div class="self:fill"></div>

        <Dialog>
          <DialogTrigger as-child>
            <div class="w-6 h-6 mr-lg rounded-full cursor-pointer">
              <img :src="user?.picture" />
            </div>
          </DialogTrigger>
          <DialogContent>
            <UpdateUser />
          </DialogContent>
        </Dialog>

        <NavTrigger view="navbar" content="notifications" :as="Button" variant="ghost" size="icon">
          <Icon name="io-notifications" />
        </NavTrigger>

        <NavTrigger view="navbar" content="settings" :as="Button" variant="ghost" size="icon">
          <Icon name="md-settings-round" />
        </NavTrigger>
      </div>

      <div class="flex:cols-lg w-full flex:center-y">
        <NavTrigger
          view="app-pane"
          content="workspaces"
          :as="Button"
          variant="ghost"
          size="badge"
          class="block rounded-md text-base text-neutral-800 font-normal whitespace-nowrap text-ellipsis overflow-hidden hover:bg-zinc-200/60"
        >
          {{ workspace?.name }}
        </NavTrigger>
        <NavTrigger view="navbar" content="switch-workspace" :as="Button" variant="outline" size="badge">
          Switch
        </NavTrigger>
      </div>
    </div>

    <nav class="flex:rows-md font-semibold">
      <NavListItem view="app-pane" content="inbox" class="flex:cols-md flex:center-y">
        <Icon name="oi-inbox" />
        Inbox
      </NavListItem>
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
  </div>
</template>
