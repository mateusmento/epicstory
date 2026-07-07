<script setup lang="ts">
import { computed } from "vue";
import { useGanttContext } from "./gantt-context";

const ctx = useGanttContext();

const visible = computed(() => ctx.cursorX.value != null && ctx.interaction.value.mode === "idle");
</script>

<template>
  <div
    v-if="visible"
    class="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-muted-foreground/40"
    :style="{ left: `${ctx.cursorX.value}px` }"
  />
</template>
