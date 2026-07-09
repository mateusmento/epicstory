import { cn } from "@/design-system/utils";
import { useResizeObserver } from "@vueuse/core";
import { computed, nextTick, onMounted, ref, watch, type ComputedRef, type HTMLAttributes } from "vue";
import type { OverflowContextValue } from "./overflow-context";
import { resolveOverflowElement } from "./overflow-element-ref";
import { resolveSegmentNaturalWidth } from "./overflow-segment-width";

function readIntrinsicWidth(el: HTMLElement): number {
  const rectW = el.getBoundingClientRect().width;
  const scrollW = el.scrollWidth;
  return Math.max(rectW, scrollW);
}

export function useOverflowSegmentElement(options: {
  id: symbol;
  context: OverflowContextValue;
  declaredWidthPx?: ComputedRef<number | undefined>;
  maxWidthPx?: ComputedRef<number | undefined>;
}) {
  const rootEl = ref<HTMLElement | null>(null);
  const measureEl = ref<HTMLElement | null>(null);

  function syncMeasureTarget() {
    const first = rootEl.value?.firstElementChild;
    measureEl.value = first instanceof HTMLElement ? first : null;
  }

  function publishNaturalWidth(measuredWidthPx: number) {
    const natural = resolveSegmentNaturalWidth({
      measuredWidthPx,
      declaredWidthPx: options.declaredWidthPx?.value,
      maxWidthPx: options.maxWidthPx?.value,
    });
    options.context.setSegmentNaturalWidth(options.id, natural);
  }

  function remeasure() {
    const declared = options.declaredWidthPx?.value;
    if (declared != null && declared > 0) {
      publishNaturalWidth(declared);
      return;
    }
    syncMeasureTarget();
    if (!measureEl.value) return;
    publishNaturalWidth(readIntrinsicWidth(measureEl.value));
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

  watch(
    () => [options.declaredWidthPx?.value, options.maxWidthPx?.value] as const,
    () => {
      remeasure();
    },
  );

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

  const stackOffsetStyle = computed(() => {
    if (!options.context.shouldApplyStackOverlap(options.id)) return undefined;
    const overlap = options.context.overlapPx.value;
    return { marginLeft: `-${overlap}px` };
  });

  watch(visible, () => {
    nextTick(remeasure);
  });

  watch(layoutReady, (ready) => {
    if (!ready) return;
    nextTick(() => {
      remeasure();
      requestAnimationFrame(remeasure);
    });
  });

  watch(
    () => options.context.remeasureGeneration.value,
    () => {
      nextTick(() => {
        remeasure();
        requestAnimationFrame(remeasure);
      });
    },
  );

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
    stackOffsetStyle,
  };
}
