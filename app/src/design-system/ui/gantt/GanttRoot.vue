<script setup lang="ts">
import { GANTT_SIDEBAR_DEFAULT_WIDTH, GANTT_SIDEBAR_MAX_WIDTH, GANTT_SIDEBAR_MIN_WIDTH } from "@/lib/gantt";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/design-system/ui/resizable";
import GanttBar from "./GanttBar.vue";
import GanttBarPreview from "./GanttBarPreview.vue";
import GanttChartTimeline from "./GanttChartTimeline.vue";
import GanttCursorLine from "./GanttCursorLine.vue";
import GanttDependencyLayer from "./GanttDependencyLayer.vue";
import GanttGrid from "./GanttGrid.vue";
import GanttGroupList from "./GanttGroupList.vue";
import GanttTodayMarker from "./GanttTodayMarker.vue";
import GanttToolbar from "./GanttToolbar.vue";
import { useGanttContext } from "./gantt-context";

const ctx = useGanttContext();
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col">
    <slot name="toolbar">
      <GanttToolbar />
    </slot>
    <ResizablePanelGroup direction="horizontal" class="h-full min-h-0 flex-1">
      <ResizablePanel
        id="gantt-sidebar"
        size-unit="px"
        :default-size="GANTT_SIDEBAR_DEFAULT_WIDTH"
        :min-size="GANTT_SIDEBAR_MIN_WIDTH"
        :max-size="GANTT_SIDEBAR_MAX_WIDTH"
        class="min-h-0"
      >
        <GanttGroupList>
          <template #item-label="slotProps">
            <slot name="item-label" v-bind="slotProps" />
          </template>
        </GanttGroupList>
      </ResizablePanel>
      <ResizableHandle with-handle />
      <ResizablePanel :min-size="30" class="min-h-0 min-w-0">
        <GanttChartTimeline>
          <slot name="chart">
            <GanttGrid />
            <GanttTodayMarker />
            <GanttCursorLine />
            <GanttDependencyLayer />
            <GanttBar v-for="item in ctx.items.value" :key="item.id" :item-id="item.id" />
            <GanttBarPreview />
          </slot>
          <slot name="chart-after" />
        </GanttChartTimeline>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
</template>
