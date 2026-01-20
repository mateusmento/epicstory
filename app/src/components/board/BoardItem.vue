<script setup lang="ts">
import { useDraggable } from "@vue-dnd-kit/core";
import { pointerSensor } from "./sensor";
import { applySortableTransferById } from "./sortable";
import { computed } from "vue";

const props = defineProps<{
  group: string;
  source: any[];
  itemId: string | number;
}>();

const { elementRef, handleDragStart, isDragging } = useDraggable({
  id: props.itemId,
  groups: [props.group],
  data: {
    source: props.source,
  },
  sensor: {
    setup: pointerSensor,
    throttle: 16,
  },
  events: {
    onHover: applySortableTransferById,
  },
});
</script>

<template>
  <div ref="elementRef" @pointerdown="handleDragStart">
    <slot :isDragging="isDragging" />
  </div>
</template>
