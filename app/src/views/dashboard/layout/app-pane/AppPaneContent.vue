<script lang="ts" setup>
import { NavViewContent } from "../nav-view";

defineProps<{
  content: string;
}>();
</script>

<template>
  <NavViewContent :content="content" class="h-full animate-collapsible-fadein">
    <slot />
  </NavViewContent>
</template>
