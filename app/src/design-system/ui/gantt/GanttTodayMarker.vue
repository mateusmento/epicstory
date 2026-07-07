<script setup lang="ts">
import { dateToX } from "@/lib/gantt";
import { computed } from "vue";
import { useGanttContext } from "./gantt-context";

const ctx = useGanttContext();

const x = computed(() => dateToX(new Date(), ctx.viewport.value));
</script>

<template>
  <div
    v-if="x >= 0 && x <= ctx.viewportWidth.value"
    class="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary"
    :style="{ left: `${x}px` }"
  />
</template>
