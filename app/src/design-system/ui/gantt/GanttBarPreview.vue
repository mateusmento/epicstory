<script setup lang="ts">
import { GANTT_BAR_HEIGHT } from "@/lib/gantt";
import { computed } from "vue";
import { useGanttContext } from "./gantt-context";

const ctx = useGanttContext();

const preview = computed(() => {
  const state = ctx.interaction.value;
  if (state.mode === "drawing") {
    const row = ctx.rowLayouts.value.find((r) => r.itemId === state.itemId);
    if (!row) return null;
    const left = Math.min(state.startX, state.currentX);
    const width = Math.max(4, Math.abs(state.currentX - state.startX));
    return { x: left, y: row.y + (row.height - GANTT_BAR_HEIGHT) / 2, width };
  }
  if (state.mode === "moving") {
    const bar = ctx.barLayouts.value.find((b) => b.itemId === state.itemId);
    if (!bar) return null;
    return { x: bar.x + state.deltaX, y: bar.y, width: bar.width };
  }
  if (state.mode === "resizing") {
    const bar = ctx.barLayouts.value.find((b) => b.itemId === state.itemId);
    if (!bar) return null;
    if (state.edge === "start") {
      const right = bar.x + bar.width;
      const left = Math.min(state.currentX, right - 4);
      return { x: left, y: bar.y, width: right - left };
    }
    const left = bar.x;
    const right = Math.max(state.currentX, left + 4);
    return { x: left, y: bar.y, width: right - left };
  }
  return null;
});
</script>

<template>
  <div
    v-if="preview"
    class="pointer-events-none absolute rounded-md border border-dashed border-primary bg-primary/20"
    :style="{
      left: `${preview.x}px`,
      top: `${preview.y}px`,
      width: `${preview.width}px`,
      height: `${GANTT_BAR_HEIGHT}px`,
    }"
  />
</template>
