<script setup lang="ts">
import type { IBacklogItem } from "@epicstory/contracts";
import { useDroppable, type IDnDPayload, type IDnDStore } from "@vue-dnd-kit/core";
import { flyToPlaceTransition } from "./transition";
import { applySortableTransferById } from "./sortable";

const props = defineProps<{
  group: string;
}>();

const emit = defineEmits<{
  drop: [args: { store: IDnDStore; payload: IDnDPayload }];
}>();

const items = defineModel<IBacklogItem[]>({ required: true });

const { elementRef } = useDroppable({
  groups: [props.group],
  data: {
    // Keep a stable reference. `applySortableTransferById` resolves refs at runtime.
    source: items,
  },
  events: {
    onHover: applySortableTransferById,
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
