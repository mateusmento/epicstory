<script setup lang="ts">
import {
  GANTT_BAR_HOVER_SLOP_PX,
  GANTT_LINK_HANDLE_SIZE_PX,
  GANTT_RESIZE_HANDLE_PX,
  barLinkHandleLocalCenterX,
} from "@/lib/gantt";
import { computed } from "vue";
import { useGanttContext } from "./gantt-context";

const props = defineProps<{ itemId: string }>();

const ctx = useGanttContext();

const bar = computed(() => ctx.barLayouts.value.find((b) => b.itemId === props.itemId));
const isMoving = computed(
  () => ctx.interaction.value.mode === "moving" && ctx.interaction.value.itemId === props.itemId,
);
const isResizing = computed(
  () => ctx.interaction.value.mode === "resizing" && ctx.interaction.value.itemId === props.itemId,
);
const moveDelta = computed(() =>
  ctx.interaction.value.mode === "moving" && ctx.interaction.value.itemId === props.itemId
    ? ctx.interaction.value.deltaX
    : 0,
);
const isHovered = computed(() => ctx.hoveredItemId.value === props.itemId);
const isLinkSource = computed(
  () => ctx.interaction.value.mode === "linking" && ctx.interaction.value.sourceItemId === props.itemId,
);
const isLinkTarget = computed(
  () =>
    ctx.interaction.value.mode === "linking" &&
    ctx.interaction.value.sourceItemId !== props.itemId &&
    bar.value != null,
);
const showResizeHandles = computed(() => isHovered.value || isResizing.value || isMoving.value);
const showLinkHandles = computed(() => isHovered.value || isLinkTarget.value || isLinkSource.value);

const wrapperStyle = computed(() => {
  if (!bar.value) return {};
  const slop = GANTT_BAR_HOVER_SLOP_PX;
  return {
    left: `${bar.value.x + moveDelta.value - slop}px`,
    top: `${bar.value.y - slop / 2}px`,
    width: `${bar.value.width + slop * 2}px`,
    height: `${bar.value.height + slop}px`,
    padding: `${slop / 2}px ${slop}px`,
  };
});

const barStyle = computed(() => {
  if (!bar.value) return {};
  return {
    width: `${bar.value.width}px`,
    height: `${bar.value.height}px`,
  };
});

function linkHandleStyle(side: "start" | "end") {
  if (!bar.value) return {};
  return {
    left: `${barLinkHandleLocalCenterX(bar.value.width, side)}px`,
    width: `${GANTT_LINK_HANDLE_SIZE_PX}px`,
    height: `${GANTT_LINK_HANDLE_SIZE_PX}px`,
    transform: "translate(-50%, -50%)",
  };
}

function chartX(event: PointerEvent) {
  return ctx.pointFromClient(event.clientX, event.clientY)?.x ?? 0;
}

function onEnter() {
  ctx.hoveredItemId.value = props.itemId;
}

function onLeave(event: PointerEvent) {
  if (ctx.interaction.value.mode === "linking") return;
  const current = event.currentTarget as HTMLElement | null;
  const related = event.relatedTarget as Node | null;
  if (current && related && current.contains(related)) return;
  if (ctx.hoveredItemId.value === props.itemId) {
    ctx.hoveredItemId.value = null;
  }
}

function onBodyPointerDown(event: PointerEvent) {
  event.stopPropagation();
  ctx.beginBarMove(props.itemId, chartX(event));
}

function onResizePointerDown(event: PointerEvent, edge: "start" | "end") {
  event.stopPropagation();
  ctx.beginBarResize(props.itemId, edge, chartX(event));
}

function onAnchorDown(event: PointerEvent, side: "start" | "end") {
  event.stopPropagation();
  event.preventDefault();
  if (side === "end") {
    ctx.startLinking(props.itemId);
  }
}
</script>

<template>
  <div
    v-if="bar"
    class="absolute z-20 touch-none select-none"
    :style="wrapperStyle"
    @pointerenter="onEnter"
    @pointerleave="onLeave"
  >
    <div class="relative" :style="barStyle">
      <!-- Interior resize handles -->
      <div
        v-if="showResizeHandles"
        class="absolute inset-y-0 left-0 z-10 cursor-ew-resize rounded-l-md bg-primary-foreground/25 ring-1 ring-inset ring-primary-foreground/40"
        :style="{ width: `${GANTT_RESIZE_HANDLE_PX}px` }"
        @pointerdown="(e) => onResizePointerDown(e, 'start')"
      />
      <div
        v-if="showResizeHandles"
        class="absolute inset-y-0 right-0 z-10 cursor-ew-resize rounded-r-md bg-primary-foreground/25 ring-1 ring-inset ring-primary-foreground/40"
        :style="{ width: `${GANTT_RESIZE_HANDLE_PX}px` }"
        @pointerdown="(e) => onResizePointerDown(e, 'end')"
      />

      <!-- Bar body (move) -->
      <div
        class="absolute inset-y-0 rounded-md border border-primary/40 bg-primary/80 shadow-sm"
        :class="isMoving ? 'cursor-grabbing' : 'cursor-grab'"
        :style="{
          left: `${GANTT_RESIZE_HANDLE_PX}px`,
          right: `${GANTT_RESIZE_HANDLE_PX}px`,
        }"
        @pointerdown="onBodyPointerDown"
      >
        <div class="pointer-events-none truncate px-2 text-xs leading-6 text-primary-foreground">
          {{ ctx.items.value.find((i) => i.id === itemId)?.label }}
        </div>
      </div>

      <!-- Link handles: gap from visual bar edge via GANTT_LINK_HANDLE_GAP_PX -->
      <button
        v-if="showLinkHandles"
        type="button"
        class="absolute top-1/2 z-30 cursor-crosshair rounded-full border-2 border-background bg-primary shadow"
        :style="linkHandleStyle('start')"
        aria-label="Dependency target"
        @pointerdown="(e) => onAnchorDown(e, 'start')"
        @pointerenter="onEnter"
      />
      <button
        v-if="showLinkHandles"
        type="button"
        class="absolute top-1/2 z-30 cursor-crosshair rounded-full border-2 border-background bg-primary shadow"
        :style="linkHandleStyle('end')"
        aria-label="Start dependency link"
        @pointerdown="(e) => onAnchorDown(e, 'end')"
        @pointerenter="onEnter"
      />
    </div>
  </div>
</template>
