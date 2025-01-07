<script setup lang="ts">
import { ref } from "vue";
import { Navbar } from "./navbar";
import { DrawerPane } from "./drawer-pane";

const isAppPaneOpen = ref(false);
const appPaneContent = ref("");

const isDetailsPaneOpen = ref(false);
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
        <DrawerPane view="app-pane" v-model:open="isAppPaneOpen" v-model:content="appPaneContent">
          <slot name="app-pane" />
        </DrawerPane>

        <!-- Main Content -->
        <section class="self:fill">
          <slot name="main-content" />
        </section>

        <DrawerPane view="details-pane" v-model:open="isDetailsPaneOpen" v-model:content="detailsPaneContent">
          <slot name="details-pane" />
        </DrawerPane>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
