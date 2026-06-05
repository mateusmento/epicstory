<script lang="ts" setup>
import type { RecurrenceFrequency } from "@/domain/schedule";

const frequency = defineModel<RecurrenceFrequency>("frequency", { required: true });
const interval = defineModel<number>("interval", { required: true });
const byWeekday = defineModel<number[]>("byWeekday", { required: true });

const emit = defineEmits<{
  toggleWeekday: [day: number, enabled: boolean];
}>();

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];
</script>

<template>
  <div class="mt-0.5 grid grid-cols-2 gap-2">
    <label class="text-xs text-muted-foreground">
      Recurrence
      <select v-model="frequency" class="mt-1 w-full h-8 rounded-md border bg-background px-2 text-sm">
        <option value="once">Once</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </select>
    </label>
    <label class="text-xs text-muted-foreground">
      Interval
      <input
        v-model.number="interval"
        type="number"
        min="1"
        class="mt-1 w-full h-8 rounded-md border bg-background px-2 text-sm outline-none"
        :disabled="frequency === 'once'"
      />
    </label>
  </div>

  <div v-if="frequency === 'weekly'" class="mt-2">
    <div class="text-xs text-muted-foreground mb-1">Weekdays</div>
    <div class="grid grid-cols-7 gap-1">
      <label
        v-for="(lbl, idx) in weekdayLabels"
        :key="idx"
        class="flex items-center justify-center gap-1 text-xs"
      >
        <input
          type="checkbox"
          :checked="byWeekday.includes(idx)"
          @change="emit('toggleWeekday', idx, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ lbl }}</span>
      </label>
    </div>
  </div>
</template>
