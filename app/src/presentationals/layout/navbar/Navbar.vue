<script lang="ts" setup>
import { NavView } from "@/design-system";
import { cn } from "@/design-system/utils";
import type { HTMLAttributes } from "vue";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <NavView view="navbar" initial-content="workspace">
    <aside :class="cn('p-2 w-64', $props.class)">
      <slot />
    </aside>
  </NavView>
</template>
