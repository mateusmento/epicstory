<script setup lang="ts">
import { useDraggable } from "@vue-dnd-kit/core";
import { pointerSensor } from "@/components/board/sensor";
import { applySortableTransferById } from "@/components/board/sortable";
import GenericDragLayer from "@/components/board/GenericDragLayer.vue";
import { computed } from "vue";

const props = defineProps<{
  group: string;
  source: any; // array OR ref(array)
  itemId: string | number;
  disabled?: boolean;

  overlayComponent?: any;
  overlayProps?: Record<string, any>;
  overlayWrapperClass?: string;
}>();

const { elementRef, handleDragStart, isDragging } = useDraggable({
  id: props.itemId,
  groups: [props.group],
  disabled: computed(() => Boolean(props.disabled)),
  data: {
    source: props.source,
    overlay: {
      component: props.overlayComponent,
      props: props.overlayProps,
      wrapperClass: props.overlayWrapperClass ?? "vue-dnd-generic-overlay",
    },
  },
  layer: GenericDragLayer,
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
  <div ref="elementRef">
    <slot :isDragging="isDragging" :handleDragStart="handleDragStart" />
  </div>
</template>
