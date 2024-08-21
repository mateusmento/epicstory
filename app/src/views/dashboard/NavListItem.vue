<script lang="ts" setup>
import { NavTrigger } from "@/design-system";

const props = defineProps<{
  view: string;
  content: string;
}>();
</script>

<template>
  <NavTrigger v-bind="props" class="px-2 py-1.5 rounded-md text-zinc-500 hover:bg-zinc-200/60 cursor-pointer">
    <slot />
  </NavTrigger>
</template>
