import { computed, inject, provide, reactive, type ComputedRef, type InjectionKey } from "vue";
import {
  computeOverflowLayout,
  type OverflowLayoutResult,
  type OverflowSegmentKind,
} from "./overflow-layout";

export type OverflowEdge = "leading" | "trailing" | "none";

type SegmentRecord = {
  id: symbol;
  kind: OverflowSegmentKind;
  order: number;
  widthPx: number;
  segmentKey?: string;
  pinned?: boolean;
};

export type OverflowEllipsisSlotProps = {
  hiddenCount: number;
  hiddenBefore: number;
  hiddenAfter: number;
  collapsed: boolean;
  hiddenSegmentKeys: string[];
};

export type OverflowRegisterOptions = {
  segmentKey?: string;
  pinned?: boolean;
};

export type OverflowContextValue = {
  registerSegment: (id: symbol, kind: OverflowSegmentKind, options?: OverflowRegisterOptions) => void;
  unregisterSegment: (id: symbol) => void;
  setSegmentWidth: (id: symbol, widthPx: number) => void;
  updateSegment: (id: symbol, options: OverflowRegisterOptions) => void;
  containerWidthPx: ComputedRef<number>;
  layoutReady: ComputedRef<boolean>;
  segmentEdge: (id: symbol) => OverflowEdge;
  isSegmentVisible: (id: symbol) => boolean;
  ellipsisSlotProps: ComputedRef<OverflowEllipsisSlotProps>;
  layoutResult: ComputedRef<OverflowLayoutResult>;
};

const OVERFLOW_CONTEXT_KEY: InjectionKey<OverflowContextValue> = Symbol("overflow-context");

export function provideOverflowContext(options: {
  gapPx: ComputedRef<number>;
  containerWidthPx: ComputedRef<number>;
}) {
  const segments = reactive(new Map<symbol, SegmentRecord>());
  let orderCounter = 0;

  function sortedSegments(): SegmentRecord[] {
    return [...segments.values()].sort((a, b) => a.order - b.order);
  }

  const layoutReady = computed(() => {
    if (options.containerWidthPx.value <= 0) return false;
    const list = sortedSegments();
    if (list.length === 0) return false;
    // Items must be measured. Ellipsis may still be 0 when its slot is empty / display:none —
    // layout falls back to DEFAULT_ELLIPSIS_WIDTH_PX until a real measure sticks.
    return list.every((segment) => segment.kind === "ellipsis" || segment.widthPx > 0);
  });

  /** Reserved when the ellipsis trigger is not measured yet (empty slot or v-show:false). */
  const DEFAULT_ELLIPSIS_WIDTH_PX = 36;

  const layoutResult = computed(() => {
    const list = sortedSegments();
    if (!layoutReady.value) {
      return {
        visible: list.map(() => true),
        showEllipsis: false,
        hiddenCount: 0,
        hiddenBefore: 0,
        hiddenAfter: 0,
        collapsed: false,
      } satisfies OverflowLayoutResult;
    }

    return computeOverflowLayout({
      containerWidthPx: options.containerWidthPx.value,
      gapPx: options.gapPx.value,
      segments: list.map((segment) => ({
        kind: segment.kind,
        widthPx:
          segment.kind === "ellipsis" && segment.widthPx <= 0 ? DEFAULT_ELLIPSIS_WIDTH_PX : segment.widthPx,
        pinned: segment.pinned,
      })),
    });
  });

  const hiddenSegmentKeys = computed(() => {
    const list = sortedSegments();
    const keys: string[] = [];

    list.forEach((segment, index) => {
      if (segment.kind !== "item" || !segment.segmentKey) return;
      if (layoutResult.value.visible[index]) return;
      keys.push(segment.segmentKey);
    });

    return keys;
  });

  const segmentIndexById = computed(() => {
    const map = new Map<symbol, number>();
    sortedSegments().forEach((segment, index) => {
      map.set(segment.id, index);
    });
    return map;
  });

  function registerSegment(id: symbol, kind: OverflowSegmentKind, options: OverflowRegisterOptions = {}) {
    segments.set(id, {
      id,
      kind,
      order: orderCounter++,
      widthPx: 0,
      segmentKey: options.segmentKey,
      pinned: options.pinned,
    });
  }

  function updateSegment(id: symbol, options: OverflowRegisterOptions) {
    const segment = segments.get(id);
    if (!segment) return;
    if (options.segmentKey !== undefined) segment.segmentKey = options.segmentKey;
    if (options.pinned !== undefined) segment.pinned = options.pinned;
  }

  function unregisterSegment(id: symbol) {
    segments.delete(id);
  }

  function setSegmentWidth(id: symbol, widthPx: number) {
    const segment = segments.get(id);
    if (!segment) return;
    // Ignore 0 after a real measure (e.g. ellipsis display:none via v-show).
    if (widthPx <= 0) return;
    // Prefer larger readings so a cramped early paint cannot permanently under-measure.
    if (widthPx >= segment.widthPx) {
      segment.widthPx = widthPx;
    }
  }

  function segmentEdge(id: symbol): OverflowEdge {
    const list = sortedSegments();
    if (list.length === 0) return "none";
    if (list[0].id === id) return "leading";
    if (list[list.length - 1].id === id) return "trailing";
    return "none";
  }

  function isSegmentVisible(id: symbol): boolean {
    const index = segmentIndexById.value.get(id);
    if (index === undefined) return true;
    return layoutResult.value.visible[index] ?? true;
  }

  const ellipsisSlotProps = computed<OverflowEllipsisSlotProps>(() => ({
    hiddenCount: layoutResult.value.hiddenCount,
    hiddenBefore: layoutResult.value.hiddenBefore,
    hiddenAfter: layoutResult.value.hiddenAfter,
    collapsed: layoutResult.value.collapsed,
    hiddenSegmentKeys: hiddenSegmentKeys.value,
  }));

  const context: OverflowContextValue = {
    registerSegment,
    unregisterSegment,
    setSegmentWidth,
    updateSegment,
    containerWidthPx: options.containerWidthPx,
    layoutReady,
    segmentEdge,
    isSegmentVisible,
    ellipsisSlotProps,
    layoutResult,
  };

  provide(OVERFLOW_CONTEXT_KEY, context);
  return context;
}

export function useOverflowContext(): OverflowContextValue {
  const context = inject(OVERFLOW_CONTEXT_KEY);
  if (!context) {
    throw new Error("Overflow components must be used within OverflowContainer.");
  }
  return context;
}

export function useOverflowSegment(options: { kind: OverflowSegmentKind }) {
  const context = useOverflowContext();
  const id = Symbol("overflow-segment");

  return {
    id,
    context,
    kind: options.kind,
  };
}
