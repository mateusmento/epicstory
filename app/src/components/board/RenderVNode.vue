<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  render: () => any;
}>();

// Wrap the render fn into a component so Vue can render returned VNodes.
const Comp = computed(() => ({
  name: "RenderVNodeInner",
  render: () => props.render?.(),
}));
</script>

<template>
  <component :is="Comp" />
</template>
