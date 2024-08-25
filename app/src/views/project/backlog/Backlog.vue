<script lang="ts" setup>
const props = defineProps<{ projectId: string }>();
</script>

<template>
  <div>Backlog of project {{ projectId }}</div>
</template>
