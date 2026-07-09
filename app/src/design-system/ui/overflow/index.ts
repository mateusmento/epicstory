export { default as OverflowContainer } from "./OverflowContainer.vue";
export { default as OverflowEllipsis } from "./OverflowEllipsis.vue";
export { default as OverflowItem } from "./OverflowItem.vue";
export { resolveOverflowBudget, shouldTruncate, type OverflowMode } from "./overflow-budget";
export { intrinsicRowWidthPx, rowWidthPx } from "./overflow-intrinsic";
export {
  computeOverflowLayout,
  type OverflowLayoutResult,
  type OverflowSegment,
  type OverflowSegmentKind,
} from "./overflow-layout";
export { resolveSegmentNaturalWidth } from "./overflow-segment-width";
export {
  computeVisibleStackedItems,
  stackItemLayoutWidthPx,
  stackedIntrinsicRowWidthPx,
  stackedRowWidthPx,
  stackStridePx,
} from "./overflow-stack-layout";
export type { OverflowEllipsisSlotProps, OverflowEdge, OverflowRegisterOptions } from "./overflow-context";
