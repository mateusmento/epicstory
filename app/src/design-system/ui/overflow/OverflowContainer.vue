<script lang="ts" setup>
import { cn } from "@/design-system/utils";
import { useResizeObserver } from "@vueuse/core";
import type { Component, HTMLAttributes } from "vue";
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import { resolveOverflowElement } from "./overflow-element-ref";
import { provideOverflowContext } from "./overflow-context";
import type { OverflowMode } from "./overflow-budget";

/** Details-pane horizontal open animation (tailwind `collapsible-horizontally-show`). */
const LAYOUT_SETTLE_MS = 300;

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    as?: Component | string;
    gap?: number;
    mode?: OverflowMode;
    overlapPx?: number;
    minVisibleItems?: number;
    /** Override CSS-allocated width (e.g. parent-measured flex slot). */
    layoutWidthPx?: number;
  }>(),
  {
    as: "div",
    gap: 4,
    mode: "auto",
    overlapPx: 0,
  },
);

const containerEl = shallowRef<HTMLElement | null>(null);
const usedContainerWidthPx = ref(0);
const lastBudgetPx = ref(0);
let settleTimer: ReturnType<typeof setTimeout> | null = null;

function readUsedWidth() {
  usedContainerWidthPx.value = containerEl.value?.getBoundingClientRect().width ?? 0;
}

function setContainerRef(value: unknown) {
  containerEl.value = resolveOverflowElement(value);
  readUsedWidth();
}

function scheduleLayoutSettleRemeasure(requestRemeasure: () => void) {
  if (settleTimer != null) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    settleTimer = null;
    readUsedWidth();
    requestRemeasure();
  }, LAYOUT_SETTLE_MS);
}

const gapPx = computed(() => props.gap);
const mode = computed(() => props.mode);
const overlapPx = computed(() => props.overlapPx);
const minVisibleItems = computed(() => props.minVisibleItems);
const layoutWidthOverridePx = computed(() => props.layoutWidthPx);
const containerGapPx = computed(() => (props.overlapPx > 0 ? 0 : props.gap));

const overflowContext = provideOverflowContext({
  gapPx,
  mode,
  overlapPx,
  minVisibleItems,
  usedContainerWidthPx: computed(() => usedContainerWidthPx.value),
  layoutWidthOverridePx,
});

useResizeObserver(containerEl, (entries) => {
  usedContainerWidthPx.value = entries[0]?.contentRect.width ?? 0;
});

watch(
  () => overflowContext.containerWidthPx.value,
  (budget) => {
    if (budget <= 0) return;
    const prev = lastBudgetPx.value;
    if (prev > 0 && Math.abs(budget - prev) > 1) {
      overflowContext.requestRemeasure();
    }
    lastBudgetPx.value = budget;
  },
);

watch(
  () => props.layoutWidthPx,
  () => {
    overflowContext.requestRemeasure();
  },
);

watch(
  () => props.mode,
  () => {
    overflowContext.requestRemeasure();
  },
);

function runInitialMeasurePasses() {
  readUsedWidth();
  requestAnimationFrame(() => {
    readUsedWidth();
    requestAnimationFrame(() => {
      readUsedWidth();
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
    :style="{ gap: `${containerGapPx}px` }"
  >
    <slot />
  </component>
</template>
