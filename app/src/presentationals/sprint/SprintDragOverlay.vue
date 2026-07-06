<script setup lang="ts">
import { useDnDStore } from "@vue-dnd-kit/core";
import { computed } from "vue";

const store = useDnDStore();

const draggingEl = computed(() => store.draggingElements.value.values().next().value ?? null);
const sourceType = computed(() => draggingEl.value?.data?.sourceType ?? null);
const issue = computed(() => draggingEl.value?.data?.issue ?? null);

const pointer = store.pointerPosition.current;
const offsetPixel = store.pointerPosition.offset.pixel;

const overlayStyle = computed(() => {
  const x = pointer.value?.x ?? 0;
  const y = pointer.value?.y ?? 0;
  const ox = offsetPixel.value?.x ?? 0;
  const oy = offsetPixel.value?.y ?? 0;
  return {
    transform: `translate3d(${x - ox}px, ${y - oy}px, 0)`,
  };
});

const visible = computed(() => store.isDragging.value && sourceType.value === "backlog" && issue.value);
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="pointer-events-none fixed left-0 top-0 z-[9999]" :style="overlayStyle">
      <div
        class="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-md shadow-lg max-w-xs"
      >
        <span class="text-xs font-mono text-muted-foreground shrink-0">
          {{ issue.issueKey ?? `#${issue.id}` }}
        </span>
        <span class="text-sm truncate">{{ issue.title }}</span>
      </div>
    </div>
  </Teleport>
</template>
