<script setup lang="ts">
import { Calendar as CalendarIcon } from "lucide-vue-next";
import { Calendar } from "@/design-system";
import { Button, type ButtonVariants } from "@/design-system/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/ui/popover";
import { cn } from "@/design-system/utils";
import { formatDate, isToday, isThisYear } from "date-fns";

defineOptions({
  inheritAttrs: false,
});

withDefaults(
  defineProps<{
    variant?: ButtonVariants["variant"];
    size?: ButtonVariants["size"];
    disabled?: boolean;
  }>(),
  {
    variant: "outline",
    disabled: false,
  },
);

const value = defineModel<Date>();

function formatDueDate(date: Date) {
  if (isToday(date)) return "Today";
  if (isThisYear(date)) return formatDate(date, "MMM d");
  return formatDate(date, "MMM d, yyyy");
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        :variant="variant"
        :size="size"
        :disabled="disabled"
        :class="cn(!value && 'text-muted-foreground')"
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{ value ? formatDueDate(value) : "No due date" }}
      </Button>
    </PopoverTrigger>
    <PopoverContent v-if="!disabled" class="w-auto p-0">
      <Calendar v-model="value" initial-focus />
    </PopoverContent>
  </Popover>
</template>
