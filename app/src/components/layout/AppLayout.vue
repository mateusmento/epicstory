<script setup lang="ts">
import { computed, ref } from "vue";
import { Navbar } from "./navbar";
import { DrawerPane } from "./drawer-pane";

const openPane = ref<string>();

const isAppPaneOpen = computed(() => openPane.value === "app-pane");

const isDetailsPaneOpen = computed(() => openPane.value === "details-pane");
</script>

<template>
  <div class="h-full">
    <div class="flex w-full h-full">
      <Navbar>
        <slot name="navbar" :isAppPaneOpen="isAppPaneOpen" />
      </Navbar>

      <main
        class="flex flex-1 min-w-0 bg-white mt-2 rounded-tl-lg border border-zinc-300/60 shadow-md shadow-zinc-300/60"
      >
        <DrawerPane
          view="app-pane"
          :open="isAppPaneOpen"
          @update:open="openPane = $event ? 'app-pane' : undefined"
        >
          <slot name="app-pane" />
        </DrawerPane>

        <!-- Main Content -->
        <section class="flex-1 min-w-0">
          <slot name="main-content" />
        </section>

        <DrawerPane
          view="details-pane"
          :open="isDetailsPaneOpen"
          @update:open="openPane = $event ? 'details-pane' : undefined"
        >
          <slot name="details-pane" />
        </DrawerPane>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
