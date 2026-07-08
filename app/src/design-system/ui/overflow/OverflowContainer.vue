<script lang="ts" setup>
import { cn } from "@/design-system/utils";
import { useResizeObserver } from "@vueuse/core";
import type { Component, HTMLAttributes } from "vue";
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import { resolveOverflowElement } from "./overflow-element-ref";
import { provideOverflowContext } from "./overflow-context";

/** Details-pane horizontal open animation (tailwind `collapsible-horizontally-show`). */
const LAYOUT_SETTLE_MS = 300;

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    as?: Component | string;
    gap?: number;
    /** When set, layout uses this width instead of self-measurement (avoids content-sized flex growth). */
    layoutWidthPx?: number;
  }>(),
  {
    as: "div",
    gap: 4,
  },
);

const containerEl = shallowRef<HTMLElement | null>(null);
const selfWidthPx = ref(0);
const lastLayoutWidthPx = ref(0);
let settleTimer: ReturnType<typeof setTimeout> | null = null;

function readSelfWidth() {
  selfWidthPx.value = containerEl.value?.getBoundingClientRect().width ?? 0;
}

function setContainerRef(value: unknown) {
  containerEl.value = resolveOverflowElement(value);
  readSelfWidth();
}

function scheduleLayoutSettleRemeasure(requestRemeasure: () => void) {
  if (settleTimer != null) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    settleTimer = null;
    readSelfWidth();
    requestRemeasure();
  }, LAYOUT_SETTLE_MS);
}

const gapPx = computed(() => props.gap);

const effectiveWidthPx = computed(() => {
  if (props.layoutWidthPx != null && props.layoutWidthPx > 0) return props.layoutWidthPx;
  return selfWidthPx.value;
});

const overflowContext = provideOverflowContext({
  gapPx,
  containerWidthPx: effectiveWidthPx,
});

useResizeObserver(containerEl, (entries) => {
  if (props.layoutWidthPx != null && props.layoutWidthPx > 0) return;
  selfWidthPx.value = entries[0]?.contentRect.width ?? 0;
});

watch(effectiveWidthPx, (width) => {
  if (width <= 0) return;
  const prev = lastLayoutWidthPx.value;
  if (prev > 0 && Math.abs(width - prev) > 1) {
    overflowContext.requestRemeasure();
  }
  lastLayoutWidthPx.value = width;
});

watch(
  () => props.layoutWidthPx,
  () => {
    overflowContext.requestRemeasure();
  },
);

function runInitialMeasurePasses() {
  readSelfWidth();
  requestAnimationFrame(() => {
    readSelfWidth();
    requestAnimationFrame(() => {
      readSelfWidth();
      overflowContext.requestRemeasure();
    });
  });
}

onMounted(() => {
  nextTick(() => {
    runInitialMeasurePasses();
    scheduleLayoutSettleRemeasure(overflowContext.requestRemeasure);
  });
});

onUnmounted(() => {
  if (settleTimer != null) clearTimeout(settleTimer);
});
</script>

<template>
  <component
    :is="as"
    :ref="setContainerRef"
    data-slot="overflow-container"
    :class="cn('flex w-full min-w-0 max-w-full flex-row items-center overflow-hidden', props.class)"
    :style="{ gap: `${props.gap}px` }"
  >
    <slot />
  </component>
</template>
