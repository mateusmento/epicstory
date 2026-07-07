<script setup lang="ts">
import { GanttProvider, GanttRoot } from "@/design-system";
import { useTeamTimeline } from "@/domain/timeline/use-team-timeline";
import { onMounted } from "vue";

const props = defineProps<{ teamId: number }>();

const {
  loading,
  error,
  zoom,
  groups,
  items,
  dependencies,
  load,
  onUpdateSchedule,
  onCreateDependency,
  onRemoveDependency,
  timeline,
} = useTeamTimeline(props.teamId);

onMounted(() => {
  load();
});

function epicKey(itemId: string) {
  return timeline.value?.epics.find((e) => String(e.id) === itemId)?.issueKey ?? itemId;
}
</script>

<template>
  <div v-if="loading" class="p-6 text-sm text-muted-foreground">Loading timeline…</div>
  <div v-else-if="error" class="p-6 text-sm text-destructive">{{ error }}</div>
  <div v-else-if="groups.length === 0" class="p-6 text-sm text-muted-foreground">
    No projects in this team yet.
  </div>
  <GanttProvider
    v-else
    class="flex h-full min-h-0 flex-1 flex-col"
    :groups="groups"
    :items="items"
    :dependencies="dependencies"
    v-model:zoom="zoom"
    @update-item-schedule="onUpdateSchedule"
    @create-dependency="onCreateDependency"
    @remove-dependency="onRemoveDependency"
  >
    <GanttRoot>
      <template #item-label="{ item }">
        <span class="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">{{
          epicKey(item.id)
        }}</span>
        <span class="min-w-0 truncate">{{ item.label }}</span>
      </template>
    </GanttRoot>
  </GanttProvider>
</template>
