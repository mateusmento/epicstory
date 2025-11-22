<script lang="ts" setup>
import { NavViewContent } from "@/design-system";
import type { Component } from "vue";

defineProps<{
  content: string;
  as?: Component;
}>();
</script>

<template>
  <NavViewContent :content="content" class="h-full animate-collapsible-fadein" #default="slotData">
    <slot v-bind="slotData">
      <component :is="as" v-bind="slotData.contentProps" />
    </slot>
  </NavViewContent>
</template>
