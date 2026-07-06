<script setup lang="ts">
import { useDeferredPointerDrag } from "@/presentationals/board/deferred-pointer-drag";
import { pointerSensor } from "@/presentationals/board/sensor";
import { applySortableTransferById } from "@/presentationals/board/sortable";
import { useDraggingById } from "@/presentationals/board";
import { useDraggable } from "@vue-dnd-kit/core";

const props = defineProps<{
  group: string;
  source: { id: string | number }[];
  itemId: string | number;
  itemData?: Record<string, unknown>;
}>();

const { elementRef, handleDragStart } = useDraggable({
  id: props.itemId,
  groups: [props.group],
  data: { source: props.source, ...props.itemData },
  sensor: { setup: pointerSensor, throttle: 16 },
  events: { onHover: applySortableTransferById },
});

const { onPointerDown } = useDeferredPointerDrag(handleDragStart);
const { isDragging } = useDraggingById();
</script>

<template>
  <!-- Keep layout space (placeholder) while the item is being dragged; hide only visually -->
  <div ref="elementRef" :class="{ 'opacity-0': isDragging(itemId) }" @pointerdown="onPointerDown">
    <slot />
  </div>
</template>
