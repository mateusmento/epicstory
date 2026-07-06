<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/design-system";
import { destinationValue, statusBadgeClass } from "@/lib/sprint";
import type { ISprint, ISprintItem } from "@epicstory/contracts";

const props = defineProps<{
  item: ISprintItem;
  futureSprints: ISprint[];
}>();

const emit = defineEmits<{
  "destination-change": [item: ISprintItem, destinationSprintId: number | null];
}>();

function handleChange(value: string) {
  const destinationSprintId = value === "backlog" ? null : +value;
  emit("destination-change", props.item, destinationSprintId);
}
</script>

<template>
  <div class="flex:row-md flex:center-y py-2 px-3 rounded-lg border border-border bg-card gap-3">
    <div class="text-xs text-muted-foreground font-mono shrink-0">
      {{ item.issue?.issueKey ?? `#${item.issue?.id}` }}
    </div>
    <div class="text-sm flex-1 truncate">{{ item.issue?.title }}</div>
    <span
      class="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
      :class="statusBadgeClass(item.completedStatus)"
    >
      {{ item.completedStatus ?? "todo" }}
    </span>
    <div class="shrink-0">
      <Select :model-value="destinationValue(item)" @update:model-value="handleChange">
        <SelectTrigger class="h-7 text-xs w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="backlog">Backlog</SelectItem>
          <SelectItem v-for="s in futureSprints" :key="s.id" :value="String(s.id)">
            {{ s.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>
