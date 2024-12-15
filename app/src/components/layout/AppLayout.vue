<script setup lang="ts">
import { ref } from "vue";
import { AppPane } from "./app-pane";
import { Navbar } from "./navbar";

const isAppPaneOpen = ref(false);
</script>

<template>
  <div class="absolute inset-0">
    <div class="flex:cols w-full h-full bg-zinc-100">
      <Navbar>
        <slot name="navbar" :isAppPaneOpen="isAppPaneOpen" />
      </Navbar>

      <main
        class="flex:cols self:fill bg-white mt-2 rounded-tl-lg border border-zinc-300/60 shadow-md shadow-zinc-300/60"
      >
        <AppPane v-model:open="isAppPaneOpen">
          <slot name="app-pane" />
        </AppPane>

        <!-- Main Content -->
        <section class="self:fill">
          <slot name="main-content" />
        </section>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
