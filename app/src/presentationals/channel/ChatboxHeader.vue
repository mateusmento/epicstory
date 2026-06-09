<script lang="ts" setup>
import { HashIcon } from "lucide-vue-next";

defineProps<{
  channelName: string;
}>();

const emit = defineEmits<{
  (e: "more-details"): void;
}>();
</script>

<template>
  <div class="flex h-10 min-w-0 items-center gap-2 p-2">
    <div class="flex shrink-0 items-center gap-2">
      <HashIcon class="h-5 w-5 text-muted-foreground" stroke-width="2.5" />
      <div class="text-sm" @click="emit('more-details')">{{ channelName }}</div>
    </div>

    <div class="flex-1" />

    <slot name="presence" />

    <slot name="meeting-actions" />
  </div>
</template>
