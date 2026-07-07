<script setup lang="ts">
import { Button, ToggleGroup, ToggleGroupItem } from "@/design-system";
import { useGanttContext } from "./gantt-context";
import type { GanttZoom } from "./types";

const ctx = useGanttContext();

const zoomOptions: { value: GanttZoom; label: string }[] = [
  { value: "year", label: "Year" },
  { value: "quarter", label: "Quarter" },
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
];
</script>

<template>
  <div class="flex w-full shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
    <ToggleGroup
      type="single"
      :model-value="ctx.zoom.value"
      class="gap-1"
      @update:model-value="(v) => v && (ctx.zoom.value = v as GanttZoom)"
    >
      <ToggleGroupItem v-for="opt in zoomOptions" :key="opt.value" :value="opt.value" class="px-3 text-xs">
        {{ opt.label }}
      </ToggleGroupItem>
    </ToggleGroup>
    <Button variant="outline" size="sm" @click="ctx.scrollToToday()">Today</Button>
  </div>
</template>
