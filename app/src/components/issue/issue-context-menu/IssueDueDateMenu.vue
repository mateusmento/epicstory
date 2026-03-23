<script setup lang="ts">
import { Button, Calendar } from "@/design-system";
import { getLocalTimeZone, parseAbsolute, type DateValue } from "@internationalized/date";
import { formatDate, isThisYear, isToday } from "date-fns";
import { CalendarIcon } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{
  dueDate: string | null | undefined;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "change", dueDate: string | null): void;
}>();

const value = computed<DateValue | undefined>(() => {
  if (!props.dueDate) return;
  try {
    return parseAbsolute(props.dueDate, getLocalTimeZone());
  } catch {
    return undefined;
  }
});

function onChange(next: DateValue | undefined) {
  if (!next) return;
  emit("change", next.toDate(getLocalTimeZone()).toISOString());
}

function formatDueDate(date: Date) {
  if (isToday(date)) return "Today";
  if (isThisYear(date)) return formatDate(date, "MMM d");
  return formatDate(date, "MMM d, yyyy");
}
</script>

<template>
  <div class="px-2 py-2" @click.stop>
    <div class="flex items-center justify-between mb-2">
      <div class="flex:row-sm items-center text-xs text-muted-foreground">
        <CalendarIcon class="mr-2 h-3 w-3" />
        {{ value ? formatDueDate(value.toDate(getLocalTimeZone())) : "No due date" }}
      </div>

      <Button
        v-if="dueDate"
        type="button"
        variant="ghost"
        size="xs"
        class="text-xs"
        :disabled="disabled"
        @click="emit('change', null)"
      >
        Clear
      </Button>
    </div>

    <Calendar
      :model-value="value"
      initial-focus
      :disabled="disabled"
      @update:model-value="onChange"
      class="p-0"
    />
  </div>
</template>
