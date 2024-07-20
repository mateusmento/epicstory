<script setup lang="ts">
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/design-system";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "radix-vue";
import { computed, ref, watch } from "vue";
import Channels from "./Channels.vue";
import { IconLeftCollapse } from "@/design-system/icons";
import Workspaces from "./Workspaces.vue";

const currentWorkspace = {
  name: "Epicstory",
  members: [],
  teams: [],
  projects: [
    {
      name: "Epicstory Design System",
      team: [],
      members: [],
    },
    {
      name: "Epicstory App",
      team: [],
      members: [],
    },
  ],
};

const currentSidebar = ref("");
const isAppSidebarOpen = ref(false);

const tabControl = computed({
  get: () => currentSidebar.value,
  set: (v) => {
    isAppSidebarOpen.value = currentSidebar.value === v ? !isAppSidebarOpen.value : true;
    currentSidebar.value = v;
  },
});
</script>

<template>
  <TabsRoot as-child v-model="tabControl" default-value="channels">
    <Collapsible :open="isAppSidebarOpen" class="absolute inset-0">
      <div class="flex:cols w-full h-full bg-zinc-100">
        <!-- Navigation sidebar -->
        <aside class="flex:rows-xl p-2 w-64 text-xs text-neutral-700">
          <TabsList as-child>
            <TabsTrigger as-child value="workspaces">
              <div
                class="flex:cols-auto flex:center-y p-2 pr-4 w-full rounded-md hover:bg-zinc-200/60 cursor-pointer"
                :class="{ 'bg-zinc-200/60 hover:bg-transparent': isAppSidebarOpen }"
              >
                <div class="flex:rows-sm">
                  <div class="text-xs text-zinc-500">Workspace</div>
                  <div class="text-lg text-neutral-800">{{ currentWorkspace.name }}</div>
                </div>
                <IconLeftCollapse :class="{ 'scale-x-[-1]': !isAppSidebarOpen }" />
              </div>
            </TabsTrigger>
            <nav class="flex:rows-md font-semibold">
              <Collapsible class="flex:rows-md">
                <CollapsibleTrigger as-child>
                  <div class="px-3 py-2 rounded-md text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">
                    Projects
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div class="flex:rows-sm px-1 rounded-sm font-normal">
                    <div class="px-2 py-1 w-fit rounded-sm text-zinc-500 hover:font-semibold cursor-pointer">
                      Clients
                    </div>
                    <div class="px-2 py-1 w-fit rounded-sm text-zinc-500 hover:font-semibold cursor-pointer">
                      Designers
                    </div>
                    <div class="px-2 py-1 w-fit rounded-sm text-zinc-500 hover:font-semibold cursor-pointer">
                      Developers
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <TabsTrigger as-child value="channels">
                <div class="px-3 py-2 rounded-md text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">
                  Channels
                </div>
              </TabsTrigger>
            </nav>
          </TabsList>
        </aside>
        <main
          class="self:fill bg-white mt-2 rounded-tl-lg border border-zinc-300/60 shadow-md shadow-zinc-300/60"
        >
          <!-- Application sidebar -->
          <CollapsibleContent
            as="aside"
            transition="horizontal"
            class="h-full w-96 p-4 border-r border-r-zinc-300/60"
          >
            <TabsContent
              value="workspaces"
              class="data-[state=open]:animate-collapsible-fadein data-[state=closed]:animate-collapsible-fadeout"
              :data-state="currentSidebar === 'workspaces' ? 'open' : 'closed'"
            >
              <Workspaces :current-workspace="currentWorkspace" />
            </TabsContent>
            <TabsContent
              value="channels"
              class="data-[state=open]:animate-collapsible-fadein data-[state=closed]:animate-collapsible-fadeout"
              :data-state="currentSidebar === 'channels' ? 'open' : 'closed'"
            >
              <Channels />
            </TabsContent>
          </CollapsibleContent>
        </main>
      </div>
    </Collapsible>
  </TabsRoot>
</template>

<style lang="scss" scoped></style>
