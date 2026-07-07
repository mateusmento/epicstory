<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useGanttContext } from "./gantt-context";

const ctx = useGanttContext();
const bodyRef = ref<HTMLElement | null>(null);
const chartRef = ref<HTMLElement | null>(null);

function onPointerDown(event: PointerEvent) {
  if (ctx.isInteracting.value) return;
  const pt = ctx.pointFromClient(event.clientX, event.clientY);
  if (!pt) return;
  ctx.onChartPointerDown(event, pt.x, pt.y);
}

function onPointerMove(event: PointerEvent) {
  const pt = ctx.pointFromClient(event.clientX, event.clientY);
  if (!pt) return;
  ctx.onChartPointerMove(event, pt.x, pt.y);
}

function onScroll() {
  if (!bodyRef.value) return;
  ctx.syncScrollY(bodyRef.value.scrollTop);
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  ctx.setChartSurface(chartRef.value);
  if (!bodyRef.value) return;
  resizeObserver = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width ?? 0;
    const height = entries[0]?.contentRect.height ?? 0;
    ctx.setViewportWidth(width);
    ctx.setViewportHeight(height);
  });
  resizeObserver.observe(bodyRef.value);
  ctx.setViewportWidth(bodyRef.value.clientWidth);
  ctx.setViewportHeight(bodyRef.value.clientHeight);
});

watch(chartRef, (el) => {
  ctx.setChartSurface(el);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  ctx.setChartSurface(null);
});
</script>

<template>
  <div
    ref="bodyRef"
    class="relative min-h-0 flex-1 overflow-auto"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerleave="ctx.onChartPointerLeave"
    @wheel.prevent="ctx.onWheel"
    @scroll="onScroll"
  >
    <div
      ref="chartRef"
      class="relative"
      :style="{
        width: `${ctx.chartWidth.value}px`,
        minHeight: `${ctx.chartHeight.value}px`,
        height: `${ctx.chartHeight.value}px`,
      }"
    >
      <slot />
    </div>
  </div>
</template>
