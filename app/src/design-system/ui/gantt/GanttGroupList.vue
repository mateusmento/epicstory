<script setup lang="ts">
import { GANTT_GROUP_HEADER_HEIGHT, GANTT_HEADER_HEIGHT, GANTT_ROW_HEIGHT } from "@/lib/gantt";
import { computed, ref, watch } from "vue";
import { useGanttContext } from "./gantt-context";

const ctx = useGanttContext();
const listRef = ref<HTMLElement | null>(null);
let syncingScroll = false;

const rows = computed(() => {
  const result: { type: "group" | "item"; id: string; label: string; y: number }[] = [];
  let y = 0;
  for (const group of ctx.groups.value) {
    result.push({ type: "group", id: group.id, label: group.label, y });
    y += GANTT_GROUP_HEADER_HEIGHT;
    for (const item of ctx.items.value.filter((i) => i.groupId === group.id)) {
      result.push({ type: "item", id: item.id, label: item.label, y });
      y += GANTT_ROW_HEIGHT;
    }
  }
  return result;
});

watch(
  () => ctx.scrollY.value,
  (scrollTop) => {
    if (!listRef.value || syncingScroll) return;
    syncingScroll = true;
    listRef.value.scrollTop = scrollTop;
    syncingScroll = false;
  },
);

function onListScroll() {
  if (!listRef.value || syncingScroll) return;
  syncingScroll = true;
  ctx.syncScrollY(listRef.value.scrollTop);
  syncingScroll = false;
}
</script>

<template>
  <div class="flex h-full min-h-0 w-full min-w-0 flex-col bg-card">
    <div
      class="shrink-0 border-b border-border bg-muted/30"
      :style="{ height: `${GANTT_HEADER_HEIGHT}px` }"
    />
    <div ref="listRef" class="min-h-0 flex-1 overflow-auto" @scroll="onListScroll">
      <div
        class="relative"
        :style="{ minHeight: `${ctx.chartHeight.value}px`, height: `${ctx.chartHeight.value}px` }"
      >
        <div
          v-for="row in rows"
          :key="`${row.type}-${row.id}`"
          class="absolute inset-x-0 flex min-w-0 items-center px-3 text-sm"
          :class="row.type === 'group' ? 'font-medium text-muted-foreground' : 'text-foreground'"
          :style="{
            top: `${row.y}px`,
            height: row.type === 'group' ? `${GANTT_GROUP_HEADER_HEIGHT}px` : `${GANTT_ROW_HEIGHT}px`,
          }"
        >
          <div v-if="row.type === 'item'" class="flex min-w-0 w-full items-center gap-2 overflow-hidden">
            <slot name="item-label" :item="ctx.items.value.find((i) => i.id === row.id)!">
              <span class="truncate">{{ row.label }}</span>
            </slot>
          </div>
          <span v-else class="truncate">{{ row.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
