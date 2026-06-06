<script lang="ts" setup>
import { cn } from "@/design-system/utils";
import { useResizeObserver } from "@vueuse/core";
import type { Component, HTMLAttributes } from "vue";
import { computed, nextTick, onMounted, ref } from "vue";
import { provideOverflowContext } from "./overflow-context";

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    as?: Component | string;
    gap?: number;
  }>(),
  {
    as: "div",
    gap: 4,
  },
);

const containerEl = ref<HTMLElement | null>(null);
const containerWidthPx = ref(0);

function readContainerWidth() {
  containerWidthPx.value = containerEl.value?.getBoundingClientRect().width ?? 0;
}

useResizeObserver(containerEl, (entries) => {
  containerWidthPx.value = entries[0]?.contentRect.width ?? 0;
});

onMounted(() => {
  nextTick(() => {
    readContainerWidth();
    requestAnimationFrame(() => readContainerWidth());
  });
});

const gapPx = computed(() => props.gap);

provideOverflowContext({
  gapPx,
  containerWidthPx: computed(() => containerWidthPx.value),
});
</script>

<template>
  <component
    :is="as"
    ref="containerEl"
    data-slot="overflow-container"
    :class="cn('flex w-full min-w-0 flex-row items-center overflow-hidden', props.class)"
    :style="{ gap: `${props.gap}px` }"
  >
    <slot />
  </component>
</template>
