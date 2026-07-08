import { cn } from "@/design-system/utils";
import { useResizeObserver } from "@vueuse/core";
import { computed, nextTick, onMounted, ref, watch, type HTMLAttributes } from "vue";
import type { OverflowContextValue } from "./overflow-context";
import { resolveOverflowElement } from "./overflow-element-ref";

/**
 * Prefer intrinsic content width when the flex item is cramped.
 * getBoundingClientRect can report a clipped/shrunk box during early layout;
 * scrollWidth tracks the unshrunk content size more reliably.
 */
function readIntrinsicWidth(el: HTMLElement): number {
  const rectW = el.getBoundingClientRect().width;
  const scrollW = el.scrollWidth;
  return Math.max(rectW, scrollW);
}

export function useOverflowSegmentElement(options: { id: symbol; context: OverflowContextValue }) {
  const rootEl = ref<HTMLElement | null>(null);
  const measureEl = ref<HTMLElement | null>(null);

  function syncMeasureTarget() {
    const first = rootEl.value?.firstElementChild;
    measureEl.value = first instanceof HTMLElement ? first : null;
  }

  function publishWidth(widthPx: number) {
    options.context.setSegmentWidth(options.id, widthPx);
  }

  function remeasure() {
    syncMeasureTarget();
    if (!measureEl.value) return;
    publishWidth(readIntrinsicWidth(measureEl.value));
  }

  function setRootEl(el: unknown) {
    rootEl.value = resolveOverflowElement(el);
    nextTick(() => {
      remeasure();
    });
  }

  useResizeObserver(measureEl, () => {
    remeasure();
  });

  watch(measureEl, () => {
    remeasure();
  });

  onMounted(() => {
    nextTick(() => {
      remeasure();
      requestAnimationFrame(() => {
        remeasure();
        requestAnimationFrame(remeasure);
      });
    });
  });

  const contentClass = computed(() => cn("inline-flex shrink-0 items-center"));

  const edge = computed(() => options.context.segmentEdge(options.id));
  const visible = computed(() => options.context.isSegmentVisible(options.id));
  const layoutReady = computed(() => options.context.layoutReady.value);

  watch(visible, () => {
    nextTick(remeasure);
  });

  // Once layout commits (or re-opens), re-read intrinsic sizes — early paint may have been cramped.
  watch(layoutReady, (ready) => {
    if (!ready) return;
    nextTick(() => {
      remeasure();
      requestAnimationFrame(remeasure);
    });
  });

  /**
   * Always shrink-0. Pre-ready flex-shrink was used for an overlap prototype, but measuring
   * shrunk boxes poisoned layout widths (clipped icons, missing ellipsis until a reflow).
   */
  function outerClass(propsClass?: HTMLAttributes["class"] | string) {
    return cn("flex min-w-0 shrink-0", propsClass);
  }

  return {
    setRootEl,
    contentClass,
    edge,
    visible,
    layoutReady,
    outerClass,
  };
}

export type OverflowSegmentElement = ReturnType<typeof useOverflowSegmentElement>;
