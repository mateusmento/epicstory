<script setup lang="ts">
import { useDroppable, type IDnDPayload } from "@vue-dnd-kit/core";

const props = defineProps<{
  group: string;
}>();

const emit = defineEmits<{
  drop: [payload: IDnDPayload];
}>();

const { elementRef } = useDroppable({
  groups: [props.group],
  data: { targetType: "backlog" },
  events: {
    onHover: () => {},
    onDrop: (_, payload) => emit("drop", payload),
  },
});
</script>

<template>
  <div ref="elementRef" class="flex flex-col flex-1 min-h-0">
    <slot />
  </div>
</template>
