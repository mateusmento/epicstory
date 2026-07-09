import { computed, inject, provide, reactive, ref, type ComputedRef, type InjectionKey } from "vue";
import { resolveOverflowBudget, type OverflowMode } from "./overflow-budget";
import { intrinsicRowWidthPx } from "./overflow-intrinsic";
import {
  computeOverflowLayout,
  type OverflowLayoutResult,
  type OverflowSegmentKind,
} from "./overflow-layout";
import { stackItemLayoutWidthPx, stackedIntrinsicRowWidthPx } from "./overflow-stack-layout";

export type OverflowEdge = "leading" | "trailing" | "none";

type SegmentRecord = {
  id: symbol;
  kind: OverflowSegmentKind;
  order: number;
  naturalWidthPx: number;
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
  setSegmentNaturalWidth: (id: symbol, widthPx: number) => void;
  updateSegment: (id: symbol, options: OverflowRegisterOptions) => void;
  overlapPx: ComputedRef<number>;
  containerWidthPx: ComputedRef<number>;
  intrinsicRowWidthPx: ComputedRef<number>;
  layoutReady: ComputedRef<boolean>;
  remeasureGeneration: ComputedRef<number>;
  requestRemeasure: () => void;
  shouldApplyStackOverlap: (id: symbol) => boolean;
  segmentOrderIndex: (id: symbol) => number;
  segmentEdge: (id: symbol) => OverflowEdge;
  isSegmentVisible: (id: symbol) => boolean;
  ellipsisSlotProps: ComputedRef<OverflowEllipsisSlotProps>;
  layoutResult: ComputedRef<OverflowLayoutResult>;
};

const OVERFLOW_CONTEXT_KEY: InjectionKey<OverflowContextValue> = Symbol("overflow-context");

const DEFAULT_ELLIPSIS_WIDTH_PX = 36;
const DEFAULT_ITEM_WIDTH_PX = 36;

function applyMinVisiblePolicy(
  result: OverflowLayoutResult,
  list: SegmentRecord[],
  minVisible: number | undefined,
): OverflowLayoutResult {
  if (minVisible == null || minVisible <= 0) return result;

  const itemIndices = list
    .map((segment, index) => (segment.kind === "item" ? index : -1))
    .filter((index) => index >= 0);
  const totalItems = itemIndices.length;
  if (totalItems < minVisible) return result;

  const visibleItems = itemIndices.filter((index) => result.visible[index]).length;
  if (visibleItems >= minVisible) return result;

  return {
    visible: list.map(() => false),
    showEllipsis: false,
    hiddenCount: totalItems,
    hiddenBefore: 0,
    hiddenAfter: totalItems,
    collapsed: true,
  };
}

function segmentLayoutWidth(
  segment: SegmentRecord,
  itemIndexAmongItems: number | undefined,
  overlapPx: number,
): number {
  const natural = segmentWidthForLayout(segment);
  if (overlapPx <= 0 || segment.kind === "ellipsis") return natural;
  const idx = itemIndexAmongItems ?? 0;
  return stackItemLayoutWidthPx(idx, natural, overlapPx);
}

function segmentWidthForLayout(segment: SegmentRecord): number {
  if (segment.naturalWidthPx > 0) return segment.naturalWidthPx;
  return segment.kind === "ellipsis" ? DEFAULT_ELLIPSIS_WIDTH_PX : DEFAULT_ITEM_WIDTH_PX;
}

export function provideOverflowContext(options: {
  gapPx: ComputedRef<number>;
  mode: ComputedRef<OverflowMode>;
  overlapPx: ComputedRef<number>;
  minVisibleItems: ComputedRef<number | undefined>;
  usedContainerWidthPx: ComputedRef<number>;
  layoutWidthOverridePx: ComputedRef<number | undefined>;
}) {
  const segments = reactive(new Map<symbol, SegmentRecord>());
  let orderCounter = 0;
  const remeasureGeneration = ref(0);

  function requestRemeasure() {
    remeasureGeneration.value += 1;
  }

  function sortedSegments(): SegmentRecord[] {
    const list = [...segments.values()].sort((a, b) => a.order - b.order);
    if (options.overlapPx.value <= 0) return list;

    const items = list.filter((segment) => segment.kind === "item");
    const ellipsisSegments = list.filter((segment) => segment.kind === "ellipsis");
    return [...items, ...ellipsisSegments];
  }

  const intrinsicRowWidth = computed(() => {
    const list = sortedSegments();
    const items = list.filter((segment) => segment.kind === "item");
    const overlap = options.overlapPx.value;

    if (overlap > 0 && items.length > 0) {
      const diameter = segmentWidthForLayout(items[0]);
      return stackedIntrinsicRowWidthPx(items.length, diameter, overlap);
    }

    const ellipsis = list.find((segment) => segment.kind === "ellipsis");
    const ellipsisReserve =
      ellipsis != null
        ? ellipsis.naturalWidthPx > 0
          ? ellipsis.naturalWidthPx
          : DEFAULT_ELLIPSIS_WIDTH_PX
        : 0;

    return intrinsicRowWidthPx(
      items.map((segment) => ({
        kind: "item" as const,
        widthPx: segmentWidthForLayout(segment),
      })),
      options.gapPx.value,
      ellipsis != null ? { ellipsisReservePx: ellipsisReserve } : {},
    );
  });

  const effectiveUsedWidthPx = computed(() => {
    const override = options.layoutWidthOverridePx.value;
    if (override != null && override > 0) return override;
    return options.usedContainerWidthPx.value;
  });

  const layoutBudgetPx = computed(() =>
    resolveOverflowBudget({
      mode: options.mode.value,
      usedContainerWidthPx: effectiveUsedWidthPx.value,
      intrinsicRowWidthPx: intrinsicRowWidth.value,
    }),
  );

  const layoutReady = computed(() => {
    if (layoutBudgetPx.value <= 0) return false;
    const list = sortedSegments();
    if (list.length === 0) return false;
    return list.every((segment) => segment.kind === "ellipsis" || segment.naturalWidthPx > 0);
  });

  const layoutResult = computed(() => {
    const list = sortedSegments();
    if (list.length === 0) {
      return {
        visible: [],
        showEllipsis: false,
        hiddenCount: 0,
        hiddenBefore: 0,
        hiddenAfter: 0,
        collapsed: false,
      } satisfies OverflowLayoutResult;
    }

    if (layoutBudgetPx.value <= 0) {
      return {
        visible: list.map((segment) => segment.kind === "item"),
        showEllipsis: false,
        hiddenCount: 0,
        hiddenBefore: 0,
        hiddenAfter: 0,
        collapsed: false,
      } satisfies OverflowLayoutResult;
    }

    const overlap = options.overlapPx.value;
    const gap = overlap > 0 ? 0 : options.gapPx.value;
    let itemIndex = 0;

    const raw = computeOverflowLayout({
      containerWidthPx: layoutBudgetPx.value,
      gapPx: gap,
      segments: list.map((segment) => {
        const widthPx =
          segment.kind === "item"
            ? segmentLayoutWidth(segment, itemIndex++, overlap)
            : segmentLayoutWidth(segment, undefined, overlap);
        return {
          kind: segment.kind,
          widthPx,
          pinned: segment.pinned,
        };
      }),
    });

    return applyMinVisiblePolicy(raw, list, options.minVisibleItems.value);
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

  function registerSegment(
    id: symbol,
    kind: OverflowSegmentKind,
    registerOptions: OverflowRegisterOptions = {},
  ) {
    segments.set(id, {
      id,
      kind,
      order: orderCounter++,
      naturalWidthPx: 0,
      segmentKey: registerOptions.segmentKey,
      pinned: registerOptions.pinned,
    });
  }

  function updateSegment(id: symbol, updateOptions: OverflowRegisterOptions) {
    const segment = segments.get(id);
    if (!segment) return;
    if (updateOptions.segmentKey !== undefined) segment.segmentKey = updateOptions.segmentKey;
    if (updateOptions.pinned !== undefined) segment.pinned = updateOptions.pinned;
  }

  function unregisterSegment(id: symbol) {
    segments.delete(id);
  }

  function setSegmentNaturalWidth(id: symbol, widthPx: number) {
    const segment = segments.get(id);
    if (!segment) return;
    if (widthPx <= 0) return;
    if (widthPx >= segment.naturalWidthPx) {
      segment.naturalWidthPx = widthPx;
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

  function segmentOrderIndex(id: symbol): number {
    return segmentIndexById.value.get(id) ?? -1;
  }

  function shouldApplyStackOverlap(id: symbol): boolean {
    if (options.overlapPx.value <= 0) return false;

    const list = sortedSegments();
    const segment = segments.get(id);
    if (!segment) return false;

    if (segment.kind === "item") {
      const firstItem = list.find((entry) => entry.kind === "item");
      return firstItem != null && firstItem.id !== id;
    }

    return list.some((entry) => entry.kind === "item");
  }

  const overlapPx = computed(() => options.overlapPx.value);

  const context: OverflowContextValue = {
    registerSegment,
    unregisterSegment,
    setSegmentNaturalWidth,
    updateSegment,
    overlapPx,
    containerWidthPx: layoutBudgetPx,
    intrinsicRowWidthPx: intrinsicRowWidth,
    layoutReady,
    remeasureGeneration: computed(() => remeasureGeneration.value),
    requestRemeasure,
    shouldApplyStackOverlap,
    segmentOrderIndex,
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
