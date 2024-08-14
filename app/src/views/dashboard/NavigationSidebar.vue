<script setup lang="ts">
import { UpdateUser, UserProfile } from "@/components/user";
import { Dialog, DialogContent, DialogTrigger } from "@/design-system";
import { IconLeftCollapse } from "@/design-system/icons";
import { useWorkspace } from "@/domain/workspace";
import { TabsTrigger } from "radix-vue";
import NavListItem from "./NavListItem.vue";

defineProps<{ isAppSidebarOpen: boolean }>();

const { workspace } = useWorkspace();
</script>

<template>
  <TabsTrigger as-child value="workspaces">
    <div
      class="flex:cols-auto flex:center-y p-2 pr-4 w-full rounded-md hover:bg-zinc-200/60 cursor-pointer"
      :class="{ 'bg-zinc-200/60 hover:bg-transparent': isAppSidebarOpen }"
    >
      <div class="flex:rows-sm w-full">
        <div class="text-xs text-zinc-500">Workspace</div>
        <div class="text-lg text-neutral-800 whitespace-nowrap text-ellipsis overflow-hidden">
          {{ workspace?.name }}
        </div>
      </div>
      <IconLeftCollapse :class="{ 'scale-x-[-1]': !isAppSidebarOpen }" />
    </div>
  </TabsTrigger>

  <nav class="flex:rows-md font-semibold">
    <NavListItem value="projects">Projects</NavListItem>
    <NavListItem value="channels">Channels</NavListItem>
    <NavListItem value="teams">Teams</NavListItem>
    <NavListItem value="workspace-members">Members</NavListItem>
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
</template>
