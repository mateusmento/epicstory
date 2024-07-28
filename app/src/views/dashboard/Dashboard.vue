<script setup lang="ts">
import { Collapsible, CollapsibleContent } from "@/design-system";
import { useWorkspace } from "@/domain/workspace/composables/workspace";
import { TabsContent, TabsRoot } from "radix-vue";
import { computed, ref } from "vue";
import Channels from "./Channels.vue";
import Projects from "./Projects.vue";
import Workspaces from "./Workspaces.vue";
import NavigationSidebar from "./NavigationSidebar.vue";

const { workspace } = useWorkspace();

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
        <NavigationSidebar :is-app-sidebar-open="isAppSidebarOpen" />
        <main
          class="self:fill bg-white mt-2 rounded-tl-lg border border-zinc-300/60 shadow-md shadow-zinc-300/60"
        >
          <!-- Application sidebar -->
          <CollapsibleContent
            as="aside"
            transition="horizontal"
            class="h-full w-96 border-r border-r-zinc-300/60"
          >
            <TabsContent
              value="workspaces"
              class="h-full p-4 data-[state=open]:animate-collapsible-fadein"
              :data-state="currentSidebar === 'workspaces' ? 'open' : 'closed'"
            >
              <Workspaces v-model:current-workspace="workspace" />
            </TabsContent>
            <TabsContent
              value="projects"
              class="h-full p-4 data-[state=open]:animate-collapsible-fadein"
              :data-state="currentSidebar === 'projects' ? 'open' : 'closed'"
            >
              <Projects v-if="workspace" :workspace="workspace" />
            </TabsContent>
            <TabsContent
              value="channels"
              class="h-full data-[state=open]:animate-collapsible-fadein"
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
