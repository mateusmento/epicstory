<script setup lang="ts">
import GanttBody from "./GanttBody.vue";
import GanttHeader from "./GanttHeader.vue";
</script>

<template>
  <div class="flex h-full min-h-0 min-w-0 flex-1 flex-col">
    <GanttHeader />
    <GanttBody>
      <slot />
    </GanttBody>
  </div>
</template>
