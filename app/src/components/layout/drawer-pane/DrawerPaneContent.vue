<script lang="ts" setup>
import { NavViewContent } from "@/design-system";

const props = defineProps<{
  content: string;
}>();
</script>

<template>
  <NavViewContent :content="content" class="h-full animate-collapsible-fadein" #default="slotData">
    <slot v-bind="slotData" />
  </NavViewContent>
</template>
