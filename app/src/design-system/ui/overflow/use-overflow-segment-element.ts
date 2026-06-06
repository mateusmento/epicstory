import { cn } from "@/design-system/utils";
import { useResizeObserver } from "@vueuse/core";
import { computed, nextTick, onMounted, ref, watch, type HTMLAttributes } from "vue";
import type { OverflowContextValue } from "./overflow-context";
import { resolveOverflowElement } from "./overflow-element-ref";

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
    publishWidth(measureEl.value.getBoundingClientRect().width);
  }

  function setRootEl(el: unknown) {
    rootEl.value = resolveOverflowElement(el);
    nextTick(() => {
      remeasure();
    });
  }

  useResizeObserver(measureEl, (entries) => {
    publishWidth(entries[0]?.contentRect.width ?? 0);
  });

  watch(measureEl, () => {
    remeasure();
  });

  onMounted(() => {
    nextTick(() => {
      remeasure();
      requestAnimationFrame(remeasure);
    });
  });

  const contentClass = computed(() => cn("inline-flex shrink-0 items-center"));

  const edge = computed(() => options.context.segmentEdge(options.id));
  const visible = computed(() => options.context.isSegmentVisible(options.id));
  const layoutReady = computed(() => options.context.layoutReady.value);

  watch(visible, () => {
    nextTick(remeasure);
  });

  function outerClass(propsClass?: HTMLAttributes["class"] | string) {
    if (!layoutReady.value) {
      return cn(
        "flex min-w-0",
        edge.value === "leading" || edge.value === "trailing" ? "shrink-[0.000001]" : "shrink",
        propsClass,
      );
    }
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
