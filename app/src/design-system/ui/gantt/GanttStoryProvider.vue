<script setup lang="ts">
import { ref } from "vue";
import GanttProvider from "./GanttProvider.vue";
import { ganttStoryDependencies, ganttStoryGroups, ganttStoryItems } from "./gantt-story-fixtures";
import type { GanttDependency, GanttGroup, GanttItem, GanttZoom } from "./types";

const props = withDefaults(
  defineProps<{
    groups?: GanttGroup[];
    items?: GanttItem[];
    dependencies?: GanttDependency[];
    zoom?: GanttZoom;
  }>(),
  {
    groups: () => ganttStoryGroups,
    items: () => ganttStoryItems,
    dependencies: () => ganttStoryDependencies,
    zoom: "month",
  },
);

const zoom = ref<GanttZoom>(props.zoom);
</script>

<template>
  <GanttProvider :groups="groups" :items="items" :dependencies="dependencies" v-model:zoom="zoom">
    <slot />
  </GanttProvider>
</template>
