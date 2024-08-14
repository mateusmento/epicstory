<script setup lang="ts">
import { Collapsible, CollapsibleContent } from "@/design-system";
import { TabsRoot, TabsList } from "radix-vue";
import { computed, provide, ref } from "vue";

const appSidebarContent = ref("");
const isAppSidebarOpen = ref(false);

const tabControl = computed({
  get: () => appSidebarContent.value,
  set: (v) => {
    isAppSidebarOpen.value = appSidebarContent.value === v ? !isAppSidebarOpen.value : true;
    appSidebarContent.value = v;
  },
});

provide("appLayout", { appSidebarContent });
</script>

<template>
  <TabsRoot as-child v-model="tabControl" default-value="channels">
    <Collapsible :open="isAppSidebarOpen" class="absolute inset-0">
      <div class="flex:cols w-full h-full bg-zinc-100">
        <TabsList as-child>
          <aside class="flex:rows-xl p-2 w-64 text-xs text-neutral-700">
            <slot name="nav-sidebar" :isAppSidebarOpen="isAppSidebarOpen" />
          </aside>
        </TabsList>

        <main
          class="self:fill bg-white mt-2 rounded-tl-lg border border-zinc-300/60 shadow-md shadow-zinc-300/60"
        >
          <!-- Application sidebar -->
          <CollapsibleContent
            as="aside"
            transition="horizontal"
            class="h-full w-96 border-r border-r-zinc-300/60"
          >
            <slot name="app-sidebar" />
          </CollapsibleContent>

          <section>
            <slot name="main-section" />
          </section>
        </main>
      </div>
    </Collapsible>
  </TabsRoot>
</template>

<style lang="scss" scoped></style>
