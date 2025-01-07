<script lang="ts" setup>
import { NavView } from "@/design-system";
</script>

<template>
  <NavView view="navbar" initial-content="workspace">
    <aside class="p-2 w-64 text-xs text-neutral-700">
      <slot />
    </aside>
  </NavView>
</template>
