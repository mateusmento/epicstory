<script setup lang="ts">
import { GANTT_HEADER_HEIGHT } from "@/lib/gantt";
import { useGanttContext } from "./gantt-context";

const ctx = useGanttContext();
</script>

<template>
  <div
    class="relative shrink-0 cursor-grab select-none overflow-hidden border-b border-border bg-muted/30 active:cursor-grabbing"
    :style="{ height: `${GANTT_HEADER_HEIGHT}px` }"
    @pointerdown="ctx.onHeaderPointerDown"
  >
    <div class="relative h-full" :style="{ width: `${ctx.chartWidth.value}px` }">
      <div
        v-for="(tick, index) in ctx.ticks.value"
        :key="index"
        class="absolute top-0 flex h-full flex-col justify-center border-r border-border/50 px-2 text-xs text-muted-foreground"
        :style="{ left: `${tick.x}px`, minWidth: '48px' }"
      >
        <span>{{ tick.label }}</span>
        <span v-if="tick.subLabel" class="text-[10px]">{{ tick.subLabel }}</span>
      </div>
    </div>
  </div>
</template>
