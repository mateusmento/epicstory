<script lang="ts" setup>
import { type HTMLAttributes, computed } from "vue";
import { CalendarRoot, type CalendarRootProps } from "radix-vue";
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarHeading,
  CalendarNextButton,
  CalendarPrevButton,
} from ".";
import { cn } from "@/design-system/utils";
import { fromDate, getLocalTimeZone, type DateValue } from "@internationalized/date";

type CalendarProps = Omit<CalendarRootProps, "modelValue" | "defaultValue"> & {
  modelValue?: Date;
  defaultValue?: Date;
  class?: HTMLAttributes["class"];
};

const props = defineProps<CalendarProps>();

const emit = defineEmits<{
  "update:modelValue": [value: Date | undefined];
  "update:placeholder": [value: DateValue];
}>();

const radixModelValue = computed<DateValue | undefined>({
  get() {
    if (props.modelValue == null) return undefined;
    return fromDate(props.modelValue, getLocalTimeZone());
  },
  set(value) {
    if (value == null) {
      emit("update:modelValue", undefined);
      return;
    }
    emit("update:modelValue", value.toDate(getLocalTimeZone()));
  },
});

const calendarBindings = computed(() => {
  const p = props as CalendarProps;
  const rest = { ...p } as Record<string, unknown>;
  delete rest.modelValue;
  delete rest.defaultValue;
  delete rest.class;
  return {
    ...rest,
    ...(p.defaultValue != null ? { defaultValue: fromDate(p.defaultValue, getLocalTimeZone()) } : {}),
  };
});
</script>

<template>
  <CalendarRoot
    v-slot="{ grid, weekDays }"
    :class="cn('p-3', props.class)"
    v-bind="calendarBindings"
    v-model="radixModelValue"
    @update:placeholder="emit('update:placeholder', $event)"
  >
    <CalendarHeader>
      <CalendarPrevButton />
      <CalendarHeading />
      <CalendarNextButton />
    </CalendarHeader>

    <div class="flex flex-col gap-y-4 mt-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
      <CalendarGrid v-for="month in grid" :key="month.value.toString()">
        <CalendarGridHead>
          <CalendarGridRow>
            <CalendarHeadCell v-for="day in weekDays" :key="day">
              {{ day }}
            </CalendarHeadCell>
          </CalendarGridRow>
        </CalendarGridHead>
        <CalendarGridBody>
          <CalendarGridRow
            v-for="(weekDates, index) in month.rows"
            :key="`weekDate-${index}`"
            class="mt-2 w-full"
          >
            <CalendarCell v-for="weekDate in weekDates" :key="weekDate.toString()" :date="weekDate">
              <CalendarCellTrigger :day="weekDate" :month="month.value" />
            </CalendarCell>
          </CalendarGridRow>
        </CalendarGridBody>
      </CalendarGrid>
    </div>
  </CalendarRoot>
</template>
