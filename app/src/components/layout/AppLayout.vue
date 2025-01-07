<script setup lang="ts">
import { computed, ref } from "vue";
import { Navbar } from "./navbar";
import { DrawerPane } from "./drawer-pane";

const openPane = ref<string>();

const isAppPaneOpen = computed(() => openPane.value === "app-pane");
const appPaneContent = ref("");

const isDetailsPaneOpen = computed(() => openPane.value === "details-pane");
const detailsPaneContent = ref("");
</script>

<template>
  <div class="h-screen">
    <div class="flex:cols w-full h-full bg-zinc-100">
      <Navbar>
        <slot name="navbar" :isAppPaneOpen="isAppPaneOpen" />
      </Navbar>

      <main
        class="flex:cols self:fill bg-white mt-2 rounded-tl-lg border border-zinc-300/60 shadow-md shadow-zinc-300/60"
      >
        <DrawerPane
          view="app-pane"
          :open="isAppPaneOpen"
          @update:open="openPane = $event ? 'app-pane' : undefined"
          v-model:content="appPaneContent"
        >
          <slot name="app-pane" />
        </DrawerPane>

        <!-- Main Content -->
        <section class="self:fill min-w-0">
          <slot name="main-content" />
        </section>

        <DrawerPane
          view="details-pane"
          :open="isDetailsPaneOpen"
          @update:open="openPane = $event ? 'details-pane' : undefined"
          v-model:content="detailsPaneContent"
        >
          <slot name="details-pane" />
        </DrawerPane>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
