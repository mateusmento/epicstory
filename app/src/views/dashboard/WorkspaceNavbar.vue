<script setup lang="ts">
import { UpdateUser, UserProfile } from "@/components/user";
import { Dialog, DialogContent, DialogTrigger, NavTrigger } from "@/design-system";
import { IconLeftCollapse } from "@/design-system/icons";
import { useWorkspace } from "@/domain/workspace";
import NavListItem from "./NavListItem.vue";

defineProps<{ isAppPaneOpen: boolean }>();

const { workspace } = useWorkspace();
</script>

<template>
  <div class="flex:rows-xl h-full">
    <NavTrigger
      view="app-pane"
      content="workspaces"
      class="flex:cols-auto flex:center-y p-2 pr-4 w-full rounded-md hover:bg-zinc-200/60 cursor-pointer"
      :class="{ 'bg-zinc-200/60 hover:bg-transparent': isAppPaneOpen }"
    >
      <div class="flex:rows-sm w-full">
        <div class="text-xs text-zinc-500">Workspace</div>
        <div class="text-lg text-neutral-800 whitespace-nowrap text-ellipsis overflow-hidden">
          {{ workspace?.name }}
        </div>
      </div>
      <IconLeftCollapse :class="{ 'scale-x-[-1]': !isAppPaneOpen }" />
    </NavTrigger>

    <nav class="flex:rows-md font-semibold">
      <NavListItem view="navbar" content="switch-workspace">Switch Workspace</NavListItem>
      <NavListItem view="app-pane" content="projects">Projects</NavListItem>
      <NavListItem view="app-pane" content="channels">Channels</NavListItem>
      <NavListItem view="app-pane" content="teams">Teams</NavListItem>
      <NavListItem view="app-pane" content="workspace-members">Members</NavListItem>
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
