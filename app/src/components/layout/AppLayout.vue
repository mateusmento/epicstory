<script setup lang="ts">
import { DrawerPane } from "./drawer-pane";
import { Navbar } from "./navbar";

const isAppPaneOpen = defineModel<boolean>("isAppPaneOpen", { required: true });
const isDetailsPaneOpen = defineModel<boolean>("isDetailsPaneOpen", { required: true });
</script>

<template>
  <div class="h-full">
    <div class="grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] w-full h-full">
      <Navbar class="col-start-1 row-start-1 -row-end-1">
        <slot name="navbar" :isAppPaneOpen="isAppPaneOpen" />
      </Navbar>

      <section class="col-start-2 row-start-1">
        <slot name="topbar" />
      </section>

      <main
        class="col-start-2 row-start-2 flex min-h-0 flex-1 min-w-0 overflow-hidden bg-white rounded-tl-lg border border-zinc-300/60 shadow-md shadow-zinc-300/60"
      >
        <DrawerPane view="app-pane" v-model:open="isAppPaneOpen">
          <slot name="app-pane" />
        </DrawerPane>

        <!-- Main Content: min-h-0 lets this flex item shrink so nested routes can use overflow-auto -->
        <section class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <slot name="main-content" />
        </section>

        <DrawerPane view="details-pane" v-model:open="isDetailsPaneOpen">
          <slot name="details-pane" />
        </DrawerPane>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
