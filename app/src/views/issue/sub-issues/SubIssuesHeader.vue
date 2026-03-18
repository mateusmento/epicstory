<script setup lang="ts">
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { computed } from "vue";

const props = defineProps<{
  collapsed: boolean;
  doneCount: number;
  totalCount: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle"): void;
  (e: "add"): void;
}>();

const progressPct = computed(() => {
  if (props.totalCount <= 0) return 0;
  return Math.round((props.doneCount / props.totalCount) * 100);
});

const progressStyle = computed(() => ({
  background: `conic-gradient(#6366F1 ${progressPct.value}%, #E4E4E7 0)`,
}));
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      type="button"
      class="flex items-center gap-2 text-sm text-secondary-foreground hover:text-foreground select-none"
      title="Toggle sub-issues"
      @click="emit('toggle')"
    >
      <Icon :name="collapsed ? 'oi-chevron-down' : 'oi-chevron-up'" class="w-3 h-3" />
      <span class="font-medium">Sub-issues</span>
      <span class="inline-flex h-4 w-4 rounded-full ring-1 ring-border" :style="progressStyle" aria-hidden="true" />
      <span class="text-xs tabular-nums">{{ doneCount }}/{{ totalCount }}</span>
    </button>

    <div class="flex-1" />

    <div class="flex items-center gap-1">
      <Button variant="ghost" size="icon" class="h-8 w-8" title="Options (coming soon)" disabled>
        <Icon name="md-tune" class="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        title="Add sub-issue"
        :disabled="disabled"
        @click="emit('add')"
      >
        <Icon name="hi-plus" class="w-4 h-4" />
      </Button>
    </div>
  </div>
</template>

