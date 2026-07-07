<script setup lang="ts">
import TeamTimelineChart from "@/containers/timeline/TeamTimelineChart.vue";
import { computed } from "vue";

const props = defineProps<{ workspaceId: string; teamId: string }>();

const teamIdNum = computed(() => Number(props.teamId));
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="border-b border-border px-6 py-4">
      <h1 class="text-lg font-semibold">Timeline</h1>
      <p class="text-sm text-muted-foreground">Epics across team projects</p>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TeamTimelineChart :team-id="teamIdNum" />
    </div>
  </div>
</template>
