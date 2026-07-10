<script lang="ts" setup>
import {
  Button,
  Input,
  Label,
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  Toggle,
} from "@/design-system";
import type { RecurrenceFrequency } from "@epicstory/contracts";
import { ChevronDown } from "lucide-vue-next";
import type { AcceptableValue } from "reka-ui";
import { computed } from "vue";

const frequency = defineModel<RecurrenceFrequency>("frequency", { required: true });
const interval = defineModel<number>("interval", { required: true });
const byWeekday = defineModel<number[]>("byWeekday", { required: true });

const emit = defineEmits<{
  toggleWeekday: [day: number, enabled: boolean];
}>();

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

const frequencyOptions: { value: RecurrenceFrequency; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const frequencyLabel = computed(
  () => frequencyOptions.find((o) => o.value === frequency.value)?.label ?? "Once",
);

const intervalText = computed({
  get: () => String(interval.value),
  set: (v: string | undefined) => {
    const n = Math.max(1, Number(v) || 1);
    interval.value = n;
  },
});

function onWeekdayPressed(idx: number, on: boolean) {
  if (on === byWeekday.value.includes(idx)) return;
  emit("toggleWeekday", idx, on);
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-1.5">
        <Label class="text-xs text-muted-foreground">Recurrence</Label>
        <Menu>
          <MenuTrigger as-child>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="w-full justify-between gap-1.5 font-normal"
            >
              <span>{{ frequencyLabel }}</span>
              <ChevronDown class="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
            </Button>
          </MenuTrigger>
          <MenuContent align="start" class="min-w-[8rem]">
            <MenuRadioGroup :model-value="frequency" @update:model-value="onFrequencyPick">
              <MenuRadioItem v-for="opt in frequencyOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </MenuRadioItem>
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
      </div>

      <div class="flex flex-col gap-1.5">
        <Label class="text-xs text-muted-foreground" for="recurrence-interval">Interval</Label>
        <Input
          id="recurrence-interval"
          v-model="intervalText"
          type="number"
          min="1"
          size="sm"
          :disabled="frequency === 'once'"
        />
      </div>
    </div>

    <div v-if="frequency === 'weekly'" class="flex flex-col gap-1.5">
      <Label class="text-xs text-muted-foreground">Weekdays</Label>
      <div class="flex flex-wrap gap-1">
        <Toggle
          v-for="(lbl, idx) in weekdayLabels"
          :key="idx"
          size="sm"
          variant="outline"
          class="h-8 w-8 p-0"
          :pressed="byWeekday.includes(idx)"
          :aria-label="lbl"
          @update:pressed="(on) => onWeekdayPressed(idx, on)"
        >
          {{ lbl }}
        </Toggle>
      </div>
    </div>
  </div>
</template>
