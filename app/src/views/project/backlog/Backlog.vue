<script setup lang="ts">
import BacklogContainer from "@/containers/views/project/backlog/BacklogContainer.vue";

defineProps<{ workspaceId: string; projectId: string }>();
</script>

<template>
  <BacklogContainer :workspace-id="workspaceId" :project-id="projectId" />
</template>
