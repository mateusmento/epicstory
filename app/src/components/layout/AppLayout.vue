<script setup lang="ts">
import { DrawerPane } from "./drawer-pane";
import { Navbar } from "./navbar";

const isAppPaneOpen = defineModel<boolean>("isAppPaneOpen", { required: true });
const isDetailsPaneOpen = defineModel<boolean>("isDetailsPaneOpen", { required: true });
</script>

<template>
  <div class="h-full">
    <div class="flex w-full h-full">
      <Navbar>
        <slot name="navbar" :isAppPaneOpen="isAppPaneOpen" />
      </Navbar>

      <main
        class="flex flex-1 min-w-0 bg-white mt-2 rounded-tl-lg border border-zinc-300/60 shadow-md shadow-zinc-300/60">
        <DrawerPane view="app-pane" v-model:open="isAppPaneOpen">
          <slot name="app-pane" />
        </DrawerPane>

        <!-- Main Content -->
        <section class="flex-1 min-w-0">
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
