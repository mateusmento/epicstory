<script setup lang="ts">
// This version of ScrollAreaViewport has a undesirable "display: table" at the container holding the slot
// Reason: https://github.com/radix-ui/primitives/issues/926#issuecomment-1630501544
// Override this with "display: <value> !important" at the immediate child of this component

import { cn } from "@/design-system/utils";
import { useInfiniteScroll } from "@vueuse/core";
import { ScrollAreaCorner, ScrollAreaRoot, type ScrollAreaRootProps, ScrollAreaViewport } from "radix-vue";
import { type HTMLAttributes, computed, nextTick, onUnmounted, ref } from "vue";
import ScrollBar from "./ScrollBar.vue";

const props = withDefaults(
  defineProps<
    ScrollAreaRootProps & {
      class?: HTMLAttributes["class"];
      /** When true, render a horizontal scrollbar (e.g. wide preformatted / code lines). */
      horizontal?: boolean;
      /** When false, hide the vertical scrollbar and prevent vertical scrolling (e.g. peek / clipped code). */
      vertical?: boolean;
    }
  >(),
  { horizontal: false, vertical: true },
);

const emit = defineEmits<{
  (e: "reached-bottom"): void;
}>();

const delegatedProps = computed(() => {
  const delegated = { ...(props as any) };
  delete delegated.class;
  delete delegated.horizontal;
  delete delegated.vertical;
  return delegated;
});

const viewportClass = computed(() =>
  cn("h-full w-full rounded-[inherit]", !props.vertical && "!overflow-y-hidden"),
);

const container = ref<{ viewportElement: HTMLElement }>();

/** Disconnect any in-flight "stabilize after scroll" observer (e.g. images still loading). */
let cancelScrollStabilize: (() => void) | null = null;

const listElement = computed(() => container.value?.viewportElement);

useInfiniteScroll(
  listElement,
  async () => {
    emit("reached-bottom");
  },
  {
    distance: 120,
    interval: 200,
    canLoadMore: () => props.vertical,
  },
);

function applyScrollToBottom(viewport: HTMLElement) {
  viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight;
}

function waitForAnimationFrame() {
  return new Promise<void>((r) => requestAnimationFrame(() => r()));
}

/**
 * Remounts inside a details pane (e.g. meeting chat thread → channel) often call
 * scroll-to-bottom before the viewport element exists or has a non-zero height.
 */
function waitForScrollableViewport(): Promise<HTMLElement | null> {
  const existing = container.value?.viewportElement;
  if (existing && existing.clientHeight > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (el: HTMLElement | null) => {
      if (settled) return;
      settled = true;
      ro.disconnect();
      clearTimeout(maxTimer);
      clearInterval(poll);
      resolve(el);
    };

    const tryResolve = () => {
      const el = container.value?.viewportElement ?? null;
      if (el && el.clientHeight > 0) finish(el);
    };

    const ro = new ResizeObserver(tryResolve);
    const observeRoot = () => {
      const el = container.value?.viewportElement;
      if (el) ro.observe(el);
    };
    observeRoot();
    // Radix may assign viewportElement after the component ref is set.
    const poll = setInterval(() => {
      observeRoot();
      tryResolve();
    }, 50);
    const maxTimer = setTimeout(() => finish(container.value?.viewportElement ?? null), 2000);
    tryResolve();
  });
}

/**
 * `nextTick` is not enough: images and other async layout can change `scrollHeight` later.
 * After an initial scroll, watch the viewport and first content child for resizes and keep
 * pinned to the bottom until height is quiet, with a hard timeout.
 *
 * Also keep pinning while `scrollHeight <= clientHeight` (virtualizer still estimating):
 * otherwise a quiet period can end before content becomes taller than the viewport.
 */
function scrollToBottomStabilize(viewport: HTMLElement) {
  const content = viewport.firstElementChild;
  applyScrollToBottom(viewport);
  if (!content) return;

  let quietTimer: ReturnType<typeof setTimeout> | null = null;
  const ro = new ResizeObserver(() => {
    applyScrollToBottom(viewport);
    if (quietTimer) clearTimeout(quietTimer);
    // Only stop stabilizing once content actually overflows — otherwise a remount with
    // estimated virtualizer height can "quiet" while still not scrollable, then grow later.
    if (viewport.scrollHeight <= viewport.clientHeight + 1) return;
    quietTimer = setTimeout(() => {
      quietTimer = null;
      applyScrollToBottom(viewport);
      cleanup();
    }, 400);
  });

  function cleanup() {
    if (quietTimer) {
      clearTimeout(quietTimer);
      quietTimer = null;
    }
    clearTimeout(maxTimer);
    ro.disconnect();
    if (cancelScrollStabilize === cleanup) {
      cancelScrollStabilize = null;
    }
  }

  const maxTimer = setTimeout(() => {
    applyScrollToBottom(viewport);
    cleanup();
  }, 5000);

  cancelScrollStabilize?.();
  cancelScrollStabilize = cleanup;
  // Viewport must be observed too: content can stay the same size while the pane
  // gains height after a v-if remount (meeting chat back-to-channel).
  ro.observe(viewport);
  ro.observe(content);
}

async function scrollContainerToBottom() {
  await nextTick();
  await waitForAnimationFrame();
  const viewport = await waitForScrollableViewport();
  if (!viewport) return;
  await waitForAnimationFrame();
  scrollToBottomStabilize(viewport);
}

onUnmounted(() => {
  cancelScrollStabilize?.();
});

defineExpose({
  scrollToBottom: scrollContainerToBottom,
  getScrollElement: () => container.value?.viewportElement ?? null,
});
</script>

<template>
  <ScrollAreaRoot v-bind="delegatedProps" :class="cn('relative overflow-hidden', props.class)">
    <ScrollAreaViewport :class="viewportClass" ref="container" as-child>
      <slot />
    </ScrollAreaViewport>
    <ScrollBar v-if="vertical" />
    <ScrollBar v-if="horizontal" orientation="horizontal" />
    <ScrollAreaCorner />
  </ScrollAreaRoot>
</template>
