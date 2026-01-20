<script setup lang="ts">
import { useDroppable } from "@vue-dnd-kit/core";
import { flyToPlaceTransition } from "./transition";

const props = defineProps<{
  group: string;
}>();

const emit = defineEmits<{
  drop: [args: { store: any; payload: any }];
}>();

const items = defineModel<any[]>({ required: true });

const { elementRef } = useDroppable({
  groups: [props.group],
  data: {
    // Keep a stable reference. `applySortableTransferById` resolves refs at runtime.
    source: items,
  },
  events: {
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
