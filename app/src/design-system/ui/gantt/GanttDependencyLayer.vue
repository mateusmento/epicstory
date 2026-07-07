<script setup lang="ts">
import { useGanttContext } from "./gantt-context";

const ctx = useGanttContext();

function onPathClick(dependencyId: string) {
  ctx.emitRemoveDependency(dependencyId);
}
</script>

<template>
  <svg
    class="pointer-events-none absolute inset-0 z-[5] overflow-visible"
    :width="ctx.chartWidth.value"
    :height="ctx.chartHeight.value"
  >
    <path
      v-for="path in ctx.committedPaths.value"
      :key="path.id"
      :d="path.d"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      class="pointer-events-auto cursor-pointer text-muted-foreground hover:text-primary"
      @click="onPathClick(path.id)"
    />
    <path
      v-if="ctx.previewPath.value"
      :d="ctx.previewPath.value"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-dasharray="6 4"
      class="text-primary"
    />
  </svg>
</template>
