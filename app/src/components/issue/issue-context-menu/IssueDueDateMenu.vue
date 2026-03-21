<script setup lang="ts">
import { Button } from "@/design-system";
import { parseAbsolute, type DateValue, getLocalTimeZone } from "@internationalized/date";
import { computed } from "vue";
import { DueDatePicker } from "@/views/project/backlog/date-picker";

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
</script>

<template>
  <div class="px-2 py-2 w-64" @click.stop>
    <div class="flex items-center justify-between mb-2">
      <div class="text-[11px] text-muted-foreground">Due date</div>
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

    <DueDatePicker :model-value="value" size="sm" :disabled="disabled" @update:model-value="onChange" />
  </div>
</template>
