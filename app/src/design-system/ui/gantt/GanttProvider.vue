<script setup lang="ts">
import { ref, toRef, watch } from "vue";
import { provideGanttContext } from "./gantt-context";
import { useGanttChart } from "./use-gantt-chart";
import type { GanttDependency, GanttGroup, GanttItem, GanttZoom } from "./types";

const props = defineProps<{
  groups: GanttGroup[];
  items: GanttItem[];
  dependencies: GanttDependency[];
  zoom: GanttZoom;
}>();

const emit = defineEmits<{
  "update:zoom": [zoom: GanttZoom];
  today: [];
  "update-item-schedule": [payload: { itemId: string; startsAt: string; endsAt: string }];
  "create-dependency": [payload: { dependentItemId: string; dependsOnItemId: string }];
  "remove-dependency": [dependencyId: string];
}>();

const zoomRef = ref<GanttZoom>(props.zoom);
watch(
  () => props.zoom,
  (value) => {
    zoomRef.value = value;
  },
);
watch(zoomRef, (value) => {
  emit("update:zoom", value);
});

const context = useGanttChart({
  groups: toRef(props, "groups"),
  items: toRef(props, "items"),
  dependencies: toRef(props, "dependencies"),
  zoom: zoomRef,
  onUpdateSchedule: (payload) => emit("update-item-schedule", payload),
  onCreateDependency: (payload) => emit("create-dependency", payload),
  onRemoveDependency: (id) => emit("remove-dependency", id),
  onToday: () => emit("today"),
});

provideGanttContext(context);
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col">
    <slot />
  </div>
</template>
