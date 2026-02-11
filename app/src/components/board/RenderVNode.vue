<script setup>
import { computed } from "vue";

const props = defineProps({
  render: {
    type: Function,
    required: true,
  },
});

// Wrap the render fn into a component so Vue can render returned VNodes.
const Comp = computed(() => ({
  name: "RenderVNodeInner",
  render: () => props.render?.(),
}));
</script>

<template>
  <component :is="Comp" />
</template>
