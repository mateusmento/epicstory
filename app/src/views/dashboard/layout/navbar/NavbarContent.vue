<script lang="ts" setup>
import { NavViewContent } from "@/design-system";

defineProps<{
  content: string;
}>();
</script>

<template>
  <NavViewContent :content="content" class="animate-collapsible-fadein">
    <slot />
  </NavViewContent>
</template>
