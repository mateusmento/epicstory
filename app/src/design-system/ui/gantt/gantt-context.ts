import type { ComputedRef, InjectionKey, Ref } from "vue";
import { inject, provide } from "vue";
import type {
  GanttBarLayout,
  GanttInteractionState,
  GanttPoint,
  GanttRowLayout,
  GanttTick,
  GanttViewport,
} from "@/lib/gantt";
import type { GanttDependency, GanttGroup, GanttItem, GanttZoom } from "./types";

export type GanttContextValue = {
  groups: ComputedRef<GanttGroup[]>;
  items: ComputedRef<GanttItem[]>;
  dependencies: ComputedRef<GanttDependency[]>;
  zoom: Ref<GanttZoom>;
  scrollX: Ref<number>;
  viewportWidth: Ref<number>;
  viewport: ComputedRef<GanttViewport>;
  rowLayouts: ComputedRef<GanttRowLayout[]>;
  barLayouts: ComputedRef<GanttBarLayout[]>;
  ticks: ComputedRef<GanttTick[]>;
  chartHeight: ComputedRef<number>;
  chartWidth: ComputedRef<number>;
  scrollY: Ref<number>;
  setChartSurface: (el: HTMLElement | null) => void;
  setViewportHeight: (height: number) => void;
  pointFromClient: (clientX: number, clientY: number) => GanttPoint | null;
  syncScrollY: (scrollTop: number) => void;
  interaction: Ref<GanttInteractionState>;
  cursorX: Ref<number | null>;
  hoveredItemId: Ref<string | null>;
  previewPath: ComputedRef<string | null>;
  committedPaths: ComputedRef<{ id: string; d: string }[]>;
  scrollToToday: () => void;
  onChartPointerDown: (event: PointerEvent, localX: number, localY: number) => void;
  onChartPointerMove: (event: PointerEvent, localX: number, localY: number) => void;
  onChartPointerUp: (event: PointerEvent, localX: number, localY: number) => void;
  onChartPointerLeave: () => void;
  onHeaderPointerDown: (event: PointerEvent) => void;
  onWheel: (event: WheelEvent) => void;
  setViewportWidth: (width: number) => void;
  emitSchedule: (payload: { itemId: string; startsAt: string; endsAt: string }) => void;
  emitCreateDependency: (payload: { dependentItemId: string; dependsOnItemId: string }) => void;
  emitRemoveDependency: (dependencyId: string) => void;
  barAnchor: (itemId: string, side: "start" | "end") => GanttPoint | null;
  barLinkHandle: (itemId: string, side: "start" | "end") => GanttPoint | null;
  startLinking: (itemId: string) => void;
  beginBarMove: (itemId: string, clientX: number) => void;
  beginBarResize: (itemId: string, edge: "start" | "end", clientX: number) => void;
  isInteracting: ComputedRef<boolean>;
};

const GANTT_CONTEXT_KEY: InjectionKey<GanttContextValue> = Symbol("gantt-context");

export function provideGanttContext(value: GanttContextValue) {
  provide(GANTT_CONTEXT_KEY, value);
  return value;
}

export function useGanttContext(): GanttContextValue {
  const context = inject(GANTT_CONTEXT_KEY);
  if (!context) {
    throw new Error("Gantt components must be used within GanttProvider.");
  }
  return context;
}
