import {
  buildTicks,
  chartWidth,
  committedDependencyPaths,
  dateToX,
  defaultChartEnd,
  layoutBars,
  layoutRows,
  chartContentHeight,
  pixelsPerDay,
  previewDependencyPath,
  resolveChartAnchorDate,
  rowAtY,
  scrollXForDate,
  snapDateToDay,
  xToDate,
  barEdgePoint,
  barLinkHandlePoint,
  type GanttBarLayout,
  type GanttInteractionState,
  type GanttPoint,
  type GanttViewport,
} from "@/lib/gantt";
import { GANTT_RESIZE_HANDLE_PX } from "@/lib/gantt";
import { formatHeaderTickWithX } from "@/lib/gantt/format";
import { computed, onMounted, onUnmounted, ref, watch, type ComputedRef, type Ref } from "vue";
import type { GanttContextValue } from "./gantt-context";
import type { GanttDependency, GanttGroup, GanttItem, GanttZoom } from "./types";

const RESIZE_ZONE_PX = GANTT_RESIZE_HANDLE_PX;
const MIN_DRAW_PX = 4;
const ANCHOR_HIT_PX = 24;

type UseGanttChartOptions = {
  groups: Ref<GanttGroup[]> | ComputedRef<GanttGroup[]>;
  items: Ref<GanttItem[]> | ComputedRef<GanttItem[]>;
  dependencies: Ref<GanttDependency[]> | ComputedRef<GanttDependency[]>;
  zoom: Ref<GanttZoom>;
  onUpdateSchedule: (payload: { itemId: string; startsAt: string; endsAt: string }) => void;
  onCreateDependency: (payload: { dependentItemId: string; dependsOnItemId: string }) => void;
  onRemoveDependency: (dependencyId: string) => void;
  onToday?: () => void;
};

export function useGanttChart(options: UseGanttChartOptions): GanttContextValue {
  const scrollX = ref(0);
  const scrollY = ref(0);
  const viewportWidth = ref(0);
  const viewportHeight = ref(0);
  const chartSurface = ref<HTMLElement | null>(null);
  const cursorX = ref<number | null>(null);
  const hoveredItemId = ref<string | null>(null);
  const interaction = ref<GanttInteractionState>({ mode: "idle" });
  let moveStartX = 0;
  let userAdjustedScroll = false;

  const anchorDate = computed(() => resolveChartAnchorDate(options.items.value));

  const viewport = computed<GanttViewport>(() => ({
    zoom: options.zoom.value,
    scrollX: scrollX.value,
    viewportWidth: viewportWidth.value,
    anchorDate: anchorDate.value,
  }));

  const rowLayouts = computed(() => layoutRows(options.groups.value, options.items.value));
  const barLayouts = computed(() => layoutBars(options.items.value, rowLayouts.value, viewport.value));

  const contentHeight = computed(() => chartContentHeight(options.groups.value, options.items.value));
  const chartHeight = computed(() => Math.max(contentHeight.value, viewportHeight.value));

  const ticks = computed(() =>
    buildTicks(viewport.value, (date, zoom) => {
      const x = dateToX(date, viewport.value);
      return formatHeaderTickWithX(date, zoom, x);
    }),
  );

  const totalChartWidth = computed(() =>
    chartWidth(options.zoom.value, anchorDate.value, defaultChartEnd(anchorDate.value)),
  );

  const barsByItemId = computed(() => new Map(barLayouts.value.map((bar) => [bar.itemId, bar])));

  function effectiveBarLayout(itemId: string): GanttBarLayout | undefined {
    const bar = barsByItemId.value.get(itemId);
    if (!bar) return undefined;
    const state = interaction.value;
    if (state.mode === "moving" && state.itemId === itemId) {
      return { ...bar, x: bar.x + state.deltaX };
    }
    if (state.mode === "resizing" && state.itemId === itemId) {
      if (state.edge === "start") {
        const right = bar.x + bar.width;
        const left = Math.min(state.currentX, right - MIN_DRAW_PX);
        return { ...bar, x: left, width: right - left };
      }
      const left = bar.x;
      const right = Math.max(state.currentX, left + MIN_DRAW_PX);
      return { ...bar, width: right - left };
    }
    return bar;
  }

  const effectiveBarsByItemId = computed(() => {
    const map = new Map<string, GanttBarLayout>();
    for (const bar of barLayouts.value) {
      const layout = effectiveBarLayout(bar.itemId);
      if (layout) map.set(bar.itemId, layout);
    }
    return map;
  });

  const previewPath = computed(() => {
    const state = interaction.value;
    if (state.mode !== "linking") return null;
    const sourceBar = effectiveBarLayout(state.sourceItemId);
    if (!sourceBar) return null;
    const from = barEdgePoint(sourceBar, "end");
    return previewDependencyPath(from, state.cursor);
  });

  const committedPaths = computed(() =>
    committedDependencyPaths(
      options.dependencies.value.map((d) => ({
        id: d.id,
        dependentItemId: d.dependentItemId,
        dependsOnItemId: d.dependsOnItemId,
      })),
      effectiveBarsByItemId.value,
    ),
  );

  const isInteracting = computed(
    () =>
      interaction.value.mode === "drawing" ||
      interaction.value.mode === "moving" ||
      interaction.value.mode === "resizing" ||
      interaction.value.mode === "linking",
  );

  function setChartSurface(el: HTMLElement | null) {
    chartSurface.value = el;
  }

  function setViewportWidth(width: number) {
    viewportWidth.value = width;
    if (width > 0 && !userAdjustedScroll) {
      centerOnToday();
    }
  }

  function setViewportHeight(height: number) {
    viewportHeight.value = height;
  }

  function syncScrollY(scrollTop: number) {
    scrollY.value = scrollTop;
  }

  function pointFromClient(clientX: number, clientY: number): GanttPoint | null {
    const el = chartSurface.value;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function centerOnToday() {
    if (viewportWidth.value <= 0) return;
    scrollX.value = scrollXForDate(new Date(), {
      zoom: options.zoom.value,
      scrollX: 0,
      viewportWidth: viewportWidth.value,
      anchorDate: anchorDate.value,
    });
  }

  function scrollToToday() {
    centerOnToday();
    options.onToday?.();
  }

  function hitBar(
    localX: number,
    localY: number,
  ): { bar: GanttBarLayout; zone: "body" | "start" | "end" } | null {
    for (const bar of barLayouts.value) {
      const layout = effectiveBarLayout(bar.itemId) ?? bar;
      if (localY < layout.y || localY > layout.y + layout.height) continue;
      if (localX < layout.x || localX > layout.x + layout.width) continue;
      const relX = localX - layout.x;
      if (relX <= RESIZE_ZONE_PX) return { bar: layout, zone: "start" };
      if (relX >= layout.width - RESIZE_ZONE_PX) return { bar: layout, zone: "end" };
      return { bar: layout, zone: "body" };
    }
    return null;
  }

  function onChartPointerDown(_event: PointerEvent, localX: number, localY: number) {
    if (interaction.value.mode === "linking") return;

    const hit = hitBar(localX, localY);
    if (hit?.zone === "body") {
      moveStartX = localX;
      interaction.value = {
        mode: "moving",
        itemId: hit.bar.itemId,
        originalStartsAt: hit.bar.startsAt,
        originalEndsAt: hit.bar.endsAt,
        deltaX: 0,
      };
      return;
    }
    if (hit?.zone === "start" || hit?.zone === "end") {
      interaction.value = {
        mode: "resizing",
        itemId: hit.bar.itemId,
        edge: hit.zone,
        anchorDate: hit.zone === "start" ? hit.bar.endsAt : hit.bar.startsAt,
        currentX: localX,
      };
      return;
    }

    const row = rowAtY(localY, options.groups.value, options.items.value);
    if (row) {
      interaction.value = {
        mode: "drawing",
        itemId: row.itemId,
        rowIndex: row.rowIndex,
        startX: localX,
        currentX: localX,
      };
    }
  }

  function onChartPointerMove(_event: PointerEvent, localX: number, localY: number) {
    cursorX.value = localX;
    const state = interaction.value;
    if (state.mode === "moving") {
      interaction.value = { ...state, deltaX: localX - moveStartX };
      return;
    }
    if (state.mode === "resizing") {
      interaction.value = { ...state, currentX: localX };
      return;
    }
    if (state.mode === "drawing") {
      interaction.value = { ...state, currentX: localX };
      return;
    }
    if (state.mode === "linking") {
      interaction.value = { ...state, cursor: { x: localX, y: localY } };
    }
  }

  function datesFromDraw(startX: number, endX: number) {
    const left = Math.min(startX, endX);
    const right = Math.max(startX, endX);
    const startsAt = snapDateToDay(xToDate(left, viewport.value)).toISOString();
    const endsAt = snapDateToDay(xToDate(right, viewport.value)).toISOString();
    return { startsAt, endsAt };
  }

  function onChartPointerUp(_event: PointerEvent, localX: number, localY: number) {
    const state = interaction.value;
    if (state.mode === "drawing") {
      const width = Math.abs(state.currentX - state.startX);
      if (width >= MIN_DRAW_PX) {
        const { startsAt, endsAt } = datesFromDraw(state.startX, state.currentX);
        if (startsAt <= endsAt) {
          options.onUpdateSchedule({ itemId: state.itemId, startsAt, endsAt });
        }
      }
    } else if (state.mode === "moving") {
      const pxPerDay = pixelsPerDay(options.zoom.value);
      const deltaDays = Math.round(state.deltaX / pxPerDay);
      if (deltaDays !== 0) {
        const start = new Date(state.originalStartsAt);
        const end = new Date(state.originalEndsAt);
        start.setUTCDate(start.getUTCDate() + deltaDays);
        end.setUTCDate(end.getUTCDate() + deltaDays);
        options.onUpdateSchedule({
          itemId: state.itemId,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
        });
      }
    } else if (state.mode === "resizing") {
      const item = options.items.value.find((i) => i.id === state.itemId);
      if (!item?.startsAt || !item.endsAt) {
        interaction.value = { mode: "idle" };
        return;
      }
      const date = snapDateToDay(xToDate(state.currentX, viewport.value)).toISOString();
      if (state.edge === "start" && date <= item.endsAt) {
        options.onUpdateSchedule({ itemId: state.itemId, startsAt: date, endsAt: item.endsAt });
      } else if (state.edge === "end" && date >= item.startsAt) {
        options.onUpdateSchedule({ itemId: state.itemId, startsAt: item.startsAt, endsAt: date });
      }
    } else if (state.mode === "linking") {
      const target = barAtLinkHandle(localX, localY, "start");
      if (target && target !== state.sourceItemId) {
        options.onCreateDependency({
          dependentItemId: target,
          dependsOnItemId: state.sourceItemId,
        });
      }
    }
    interaction.value = { mode: "idle" };
  }

  function barAtLinkHandle(localX: number, localY: number, side: "start" | "end"): string | null {
    for (const bar of barLayouts.value) {
      const layout = effectiveBarLayout(bar.itemId) ?? bar;
      const handle = barLinkHandlePoint(layout, side);
      const dx = localX - handle.x;
      const dy = localY - handle.y;
      if (Math.hypot(dx, dy) <= ANCHOR_HIT_PX) return bar.itemId;
    }
    return null;
  }

  function onChartPointerLeave() {
    cursorX.value = null;
    if (interaction.value.mode === "drawing") {
      interaction.value = { mode: "idle" };
    }
  }

  function onHeaderPointerDown(event: PointerEvent) {
    if (isInteracting.value) return;
    userAdjustedScroll = true;
    interaction.value = {
      mode: "panning",
      startScrollX: scrollX.value,
      startClientX: event.clientX,
    };
  }

  function onGlobalPointerMove(event: PointerEvent) {
    const state = interaction.value;
    if (state.mode === "panning") {
      const delta = event.clientX - state.startClientX;
      scrollX.value = Math.max(0, state.startScrollX - delta);
      return;
    }
    if (state.mode === "idle") return;
    const pt = pointFromClient(event.clientX, event.clientY);
    if (!pt) return;
    onChartPointerMove(event, pt.x, pt.y);
  }

  function onGlobalPointerUp(event: PointerEvent) {
    const state = interaction.value;
    if (state.mode === "panning") {
      interaction.value = { mode: "idle" };
      return;
    }
    if (state.mode === "idle") return;
    const pt = pointFromClient(event.clientX, event.clientY);
    if (pt) onChartPointerUp(event, pt.x, pt.y);
    else interaction.value = { mode: "idle" };
  }

  function onWheel(event: WheelEvent) {
    if (isInteracting.value) return;
    userAdjustedScroll = true;
    scrollX.value = Math.max(0, scrollX.value + event.deltaY);
  }

  function beginBarMove(itemId: string, clientX: number) {
    const bar = barsByItemId.value.get(itemId);
    if (!bar) return;
    moveStartX = clientX;
    interaction.value = {
      mode: "moving",
      itemId,
      originalStartsAt: bar.startsAt,
      originalEndsAt: bar.endsAt,
      deltaX: 0,
    };
  }

  function beginBarResize(itemId: string, edge: "start" | "end", clientX: number) {
    const bar = barsByItemId.value.get(itemId);
    if (!bar) return;
    interaction.value = {
      mode: "resizing",
      itemId,
      edge,
      anchorDate: edge === "start" ? bar.endsAt : bar.startsAt,
      currentX: clientX,
    };
  }

  function startLinking(itemId: string) {
    const bar = barsByItemId.value.get(itemId);
    if (!bar) return;
    const from = barEdgePoint(bar, "end");
    interaction.value = {
      mode: "linking",
      sourceItemId: itemId,
      sourceAnchor: from,
      cursor: from,
    };
  }

  function barLinkHandle(itemId: string, side: "start" | "end"): GanttPoint | null {
    const layout = effectiveBarLayout(itemId);
    if (!layout) return null;
    return barLinkHandlePoint(layout, side);
  }

  function barAnchor(itemId: string, side: "start" | "end"): GanttPoint | null {
    const layout = effectiveBarLayout(itemId);
    if (!layout) return null;
    return barEdgePoint(layout, side);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      interaction.value = { mode: "idle" };
    }
  }

  onMounted(() => {
    window.addEventListener("pointermove", onGlobalPointerMove);
    window.addEventListener("pointerup", onGlobalPointerUp);
    window.addEventListener("keydown", onKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener("pointermove", onGlobalPointerMove);
    window.removeEventListener("pointerup", onGlobalPointerUp);
    window.removeEventListener("keydown", onKeyDown);
  });

  watch(anchorDate, () => {
    if (!userAdjustedScroll && viewportWidth.value > 0) {
      centerOnToday();
    }
  });

  watch(
    () => options.zoom.value,
    () => {
      userAdjustedScroll = false;
      centerOnToday();
    },
  );

  return {
    groups: computed(() => options.groups.value),
    items: computed(() => options.items.value),
    dependencies: computed(() => options.dependencies.value),
    zoom: options.zoom,
    scrollX,
    scrollY,
    viewportWidth,
    viewport,
    rowLayouts,
    barLayouts,
    ticks,
    chartHeight,
    chartWidth: totalChartWidth,
    interaction,
    cursorX,
    hoveredItemId,
    previewPath,
    committedPaths,
    scrollToToday,
    onChartPointerDown,
    onChartPointerMove,
    onChartPointerUp,
    onChartPointerLeave,
    onHeaderPointerDown,
    onWheel,
    setViewportWidth,
    setViewportHeight,
    setChartSurface,
    pointFromClient,
    syncScrollY,
    emitSchedule: options.onUpdateSchedule,
    emitCreateDependency: options.onCreateDependency,
    emitRemoveDependency: options.onRemoveDependency,
    barAnchor,
    barLinkHandle,
    startLinking,
    beginBarMove,
    beginBarResize,
    isInteracting,
  };
}
