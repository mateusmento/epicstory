<script setup lang="ts">
import { UpdateUser, UserProfile } from "@/components/user";
import { Dialog, DialogContent, DialogTrigger } from "@/design-system";
import { IconLeftCollapse } from "@/design-system/icons";
import { useWorkspace } from "@/domain/workspace";
import { TabsList, TabsTrigger } from "radix-vue";

defineProps<{ isAppSidebarOpen: boolean }>();

const { workspace } = useWorkspace();
</script>

<template>
  <aside class="flex:rows-xl p-2 w-64 text-xs text-neutral-700">
    <TabsList as-child>
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
        <TabsTrigger as-child value="projects">
          <div class="px-2 py-1.5 rounded-md text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">Projects</div>
        </TabsTrigger>

        <TabsTrigger as-child value="channels">
          <div class="px-2 py-1.5 rounded-md text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">Channels</div>
        </TabsTrigger>

        <TabsTrigger as-child value="teams">
          <div class="px-2 py-1.5 rounded-md text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">Teams</div>
        </TabsTrigger>

        <TabsTrigger as-child value="workspace-members">
          <div class="px-2 py-1.5 rounded-md text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">Members</div>
        </TabsTrigger>
      </nav>
    </TabsList>
    <div class="self:fill"></div>

    <Dialog>
      <DialogTrigger as-child>
        <UserProfile />
      </DialogTrigger>
      <DialogContent>
        <UpdateUser />
      </DialogContent>
    </Dialog>
  </aside>
</template>
