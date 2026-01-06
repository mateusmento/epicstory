<script setup lang="ts">
import { DateFormatter, type DateValue, getLocalTimeZone } from "@internationalized/date";
import { Calendar as CalendarIcon } from "lucide-vue-next";
import { Calendar } from "@/design-system/ui/calendar";
import { Button, type ButtonVariants } from "@/design-system/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/ui/popover";
import { cn } from "@/design-system/utils";
import { formatDate, isToday, isThisYear } from "date-fns";

withDefaults(
  defineProps<{
    variant?: ButtonVariants["variant"];
    size?: ButtonVariants["size"];
  }>(),
  {
    variant: "outline",
  },
);

const value = defineModel<DateValue>();
const df = new DateFormatter("en-US", {
  dateStyle: "long",
});

function formatDueDate(date: Date) {
  if (isToday(date)) return "Today";
  if (isThisYear(date)) return formatDate(date, "MMM d");
  return formatDate(date, "MMM d, yyyy");
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button :variant="variant" :size="size" :class="cn(!value && 'text-muted-foreground')">
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{ value ? formatDueDate(value.toDate(getLocalTimeZone())) : "No due date" }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <Calendar v-model="value" initial-focus />
    </PopoverContent>
  </Popover>
</template>
