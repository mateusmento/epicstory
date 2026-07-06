<script setup lang="ts">
import type { ISprint } from "@epicstory/contracts";
import { computed } from "vue";

const props = defineProps<{
  sprints: ISprint[];
  highlightSprintId?: number;
  barHeight?: number;
}>();

const height = computed(() => props.barHeight ?? 72);

const maxItemCount = computed(() => Math.max(...props.sprints.map((s) => s.itemCount), 1));

function completedBarHeight(sprint: ISprint): number {
  return (sprint.completedItemCount / maxItemCount.value) * height.value;
}

function incompleteBarHeight(sprint: ISprint): number {
  const incomplete = sprint.itemCount - sprint.completedItemCount;
  return incomplete > 0 ? (incomplete / maxItemCount.value) * height.value : 0;
}
</script>

<template>
  <div class="flex items-end gap-1.5 px-1" :style="{ height: `${height + 20}px` }">
    <div v-for="sprint in sprints" :key="sprint.id" class="flex:col gap-0.5 flex-1 items-center">
      <div class="w-full flex:col gap-0.5 justify-end" :style="{ height: `${height}px` }">
        <div
          v-if="incompleteBarHeight(sprint) > 0"
          class="w-full rounded-sm bg-muted"
          :style="{ height: `${incompleteBarHeight(sprint)}px` }"
        />
        <div
          class="w-full rounded-sm transition-all"
          :class="sprint.id === highlightSprintId ? 'bg-primary' : 'bg-primary/60'"
          :style="{ height: `${Math.max(completedBarHeight(sprint), 2)}px` }"
        />
      </div>
      <div class="text-xs text-muted-foreground truncate w-full text-center mt-1">
        {{ sprint.name.replace("Sprint ", "") }}
      </div>
    </div>
  </div>
</template>
