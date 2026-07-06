<script setup lang="ts">
import { flyToPlaceTransition } from "@/presentationals/board/transition";
import { applySortableTransferById } from "@/presentationals/board/sortable";
import { useDroppable, type IDnDPayload, type IDnDStore } from "@vue-dnd-kit/core";
import type { ISprintItem } from "@epicstory/contracts";

const props = defineProps<{
  group: string;
  sprintId: number;
  source: ISprintItem[];
}>();

const emit = defineEmits<{
  drop: [{ store: IDnDStore; payload: IDnDPayload }];
}>();

function onHover(store: IDnDStore) {
  const dragging = store?.draggingElements?.value?.values?.().next?.().value ?? null;
  const data = dragging?.data;
  // Only apply sortable reordering when the dragged item is from THIS sprint
  if (data?.sourceType !== "sprint" || data?.sprintId !== props.sprintId) return;
  applySortableTransferById(store);
}

const { elementRef } = useDroppable({
  groups: [props.group],
  data: { source: props.source, targetType: "sprint", sprintId: props.sprintId },
  events: {
    onHover,
    onDrop: (store, payload) => {
      emit("drop", { store, payload });
      return flyToPlaceTransition(store, payload);
    },
  },
});
</script>

<template>
  <div ref="elementRef">
    <slot />
  </div>
</template>
