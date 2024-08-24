<script lang="ts" setup>
import { ref } from "vue";
import { NavView } from "@/design-system";

const content = ref("workspace");
</script>

<template>
  <NavView view="navbar" v-model:content="content">
    <aside class="p-2 w-64 text-xs text-neutral-700">
      <slot />
    </aside>
  </NavView>
</template>
