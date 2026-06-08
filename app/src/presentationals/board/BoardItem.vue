<script setup lang="ts">
import { useDraggable } from "@vue-dnd-kit/core";
import { pointerSensor } from "./sensor";
import { applySortableTransferById } from "./sortable";
import { useDeferredPointerDrag } from "./deferred-pointer-drag";

const props = defineProps<{
  group: string;
  source: any[];
  itemId: string | number;
}>();

const { elementRef, handleDragStart } = useDraggable({
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

const { onPointerDown } = useDeferredPointerDrag(handleDragStart);
</script>

<template>
  <div ref="elementRef" @pointerdown="onPointerDown">
    <slot />
  </div>
</template>
