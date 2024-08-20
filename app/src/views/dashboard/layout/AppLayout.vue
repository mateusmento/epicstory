<script setup lang="ts">
import { ref } from "vue";
import AppPane from "./app-pane/AppPane.vue";

const isAppPaneOpen = ref(true);
</script>

<template>
  <div class="absolute inset-0">
    <div class="flex:cols w-full h-full bg-zinc-100">
      <aside class="flex:rows-xl p-2 w-64 text-xs text-neutral-700">
        <slot name="nav-sidebar" :isAppPaneOpen="isAppPaneOpen" />
      </aside>

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
