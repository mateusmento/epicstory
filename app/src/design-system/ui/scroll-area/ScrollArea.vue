<script setup lang="ts">
// This version of ScrollAreaViewport has a undesirable "display: table" at the container holding the slot
// Reason: https://github.com/radix-ui/primitives/issues/926#issuecomment-1630501544
// Override this with "display: <value> !important" at the immediate child of this component

import { cn } from "@/design-system/utils";
import { useInfiniteScroll } from "@vueuse/core";
import { ScrollAreaCorner, ScrollAreaRoot, type ScrollAreaRootProps, ScrollAreaViewport } from "radix-vue";
import { type HTMLAttributes, computed, nextTick, onUnmounted, ref } from "vue";
import ScrollBar from "./ScrollBar.vue";

const props = defineProps<
  ScrollAreaRootProps & {
    class?: HTMLAttributes["class"];
  }
>();

const emit = defineEmits<{
  (e: "reached-bottom"): void;
}>();

const delegatedProps = computed(() => {
  const delegated = { ...(props as any) };
  delete delegated.class;
  return delegated;
});

const container = ref<{ viewportElement: HTMLElement }>();

/** Disconnect any in-flight "stabilize after scroll" observer (e.g. images still loading). */
let cancelScrollStabilize: (() => void) | null = null;

const listElement = computed(() => container.value?.viewportElement);

useInfiniteScroll(
  listElement,
  async () => {
    emit("reached-bottom");
  },
  { distance: 120, interval: 200 },
);

function applyScrollToBottom(viewport: HTMLElement) {
  viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight;
}

/**
 * `nextTick` is not enough: images and other async layout can change `scrollHeight` later.
 * After an initial scroll, watch the first content child for resizes and keep pinned to the
 * bottom until height is quiet, with a hard timeout.
 */
function scrollToBottomStabilize(viewport: HTMLElement) {
  const content = viewport.firstElementChild;
  if (!content) {
    applyScrollToBottom(viewport);
    return;
  }

  applyScrollToBottom(viewport);

  let quietTimer: ReturnType<typeof setTimeout> | null = null;
  const ro = new ResizeObserver(() => {
    applyScrollToBottom(viewport);
    if (quietTimer) clearTimeout(quietTimer);
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
  ro.observe(content);
}

async function scrollContainerToBottom() {
  await nextTick();
  // One frame so the browser can apply layout from the just-updated VDOM.
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  const viewport = container.value?.viewportElement;
  if (!viewport) return;
  scrollToBottomStabilize(viewport);
}

onUnmounted(() => {
  cancelScrollStabilize?.();
});

defineExpose({
  scrollToBottom: scrollContainerToBottom,
});
</script>

<template>
  <ScrollAreaRoot v-bind="delegatedProps" :class="cn('relative overflow-hidden', props.class)">
    <ScrollAreaViewport class="h-full w-full rounded-[inherit]" ref="container" as-child>
      <slot />
    </ScrollAreaViewport>
    <ScrollBar />
    <ScrollAreaCorner />
  </ScrollAreaRoot>
</template>
