<script setup lang="ts">
import { GANTT_GROUP_HEADER_HEIGHT, GANTT_ROW_HEIGHT } from "@/lib/gantt";
import { computed } from "vue";
import { useGanttContext } from "./gantt-context";

const ctx = useGanttContext();

const rowLines = computed(() => {
  const lines: { y: number; height: number }[] = [];
  let y = 0;
  for (const group of ctx.groups.value) {
    y += GANTT_GROUP_HEADER_HEIGHT;
    for (const _item of ctx.items.value.filter((i) => i.groupId === group.id)) {
      lines.push({ y, height: GANTT_ROW_HEIGHT });
      y += GANTT_ROW_HEIGHT;
    }
  }
  return lines;
});
</script>

<template>
  <div class="pointer-events-none absolute inset-0">
    <div
      v-for="(tick, index) in ctx.ticks.value"
      :key="`v-${index}`"
      class="absolute top-0 bottom-0 border-l border-border/30"
      :style="{ left: `${tick.x}px` }"
    />
    <div
      v-for="(row, index) in rowLines"
      :key="`h-${index}`"
      class="absolute inset-x-0 border-b border-border/20"
      :style="{ top: `${row.y}px`, height: `${row.height}px` }"
    />
  </div>
</template>
