<script setup lang="ts">
import {
  Button,
  Calendar,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Separator,
} from "@/design-system";
import { addDays, setHours, setMinutes, setSeconds, startOfDay } from "date-fns";
import { computed, ref, watch } from "vue";
import type { ResolvedSchedule } from "./schedule-builders";
import { formatScheduleSummary } from "./schedule-builders";

const emit = defineEmits<{
  confirm: [schedule: ResolvedSchedule];
}>();

const open = defineModel<boolean>("open", { required: false, default: false });

const mode = ref<"once" | "daily" | "weekly">("once");
const calDate = ref<Date>(new Date());
const timeStr = ref("09:00");
const dailyInterval = ref(1);
const weeklyInterval = ref(1);
const weekdayToggles = ref<boolean[]>([false, true, false, false, false, false, false]);

const preview = computed((): ResolvedSchedule | null => {
  const [hh, mm] = timeStr.value.split(":").map((x) => parseInt(x, 10) || 0);
  if (mode.value === "once") {
    const d = new Date(calDate.value);
    const dueAt = setSeconds(setMinutes(setHours(startOfDay(d), hh), mm), 0);
    if (Number.isNaN(dueAt.getTime())) return null;
    return {
      dueAt,
      recurrence: { frequency: "once" },
      label: "Once",
    };
  }
  if (mode.value === "daily") {
    const n = Math.max(1, dailyInterval.value);
    const base = new Date();
    const due0 = setSeconds(setMinutes(setHours(startOfDay(base), hh), mm), 0);
    const dueAt = due0.getTime() < Date.now() ? addDays(due0, 1) : due0;
    const pad = (t: number) => t.toString().padStart(2, "0");
    return {
      dueAt,
      recurrence: { frequency: "daily" as const, interval: n, timeOfDay: `${pad(hh)}:${pad(mm)}:00` },
      label: "Daily",
    };
  }
  const days: number[] = [];
  weekdayToggles.value.forEach((on, i) => {
    if (on) days.push(i);
  });
  if (days.length === 0) return null;
  const n = Math.max(1, weeklyInterval.value);
  const dueAt = setSeconds(setMinutes(setHours(startOfDay(new Date()), hh), mm), 0);
  const pad = (t: number) => t.toString().padStart(2, "0");
  return {
    dueAt: dueAt.getTime() < Date.now() ? addDays(dueAt, 1) : dueAt,
    recurrence: {
      frequency: "weekly" as const,
      interval: n,
      weekdays: days,
      timeOfDay: `${pad(hh)}:${pad(mm)}:00`,
    },
    label: "Weekly",
  };
});

const summary = computed(() => (preview.value ? formatScheduleSummary(preview.value) : ""));

function close() {
  open.value = false;
}

function onConfirm() {
  const p = preview.value;
  if (!p) return;
  if (p.recurrence.frequency === "weekly" && (!p.recurrence.weekdays || p.recurrence.weekdays.length === 0)) {
    return;
  }
  emit("confirm", p);
  close();
}

watch(
  () => open.value,
  (o) => {
    if (o) {
      mode.value = "once";
      calDate.value = new Date();
      timeStr.value = "09:00";
      dailyInterval.value = 1;
      weeklyInterval.value = 1;
      weekdayToggles.value = [false, true, false, false, false, false, false];
    }
  },
);
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="z-[60] max-w-md">
      <DialogHeader>
        <DialogTitle>Custom schedule</DialogTitle>
      </DialogHeader>
      <div class="flex:col gap-4 text-sm">
        <div class="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            :variant="mode === 'once' ? 'default' : 'outline'"
            @click="mode = 'once'"
          >
            Once
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="mode === 'daily' ? 'default' : 'outline'"
            @click="mode = 'daily'"
          >
            Every day
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="mode === 'weekly' ? 'default' : 'outline'"
            @click="mode = 'weekly'"
          >
            Every week
          </Button>
        </div>
        <Separator />
        <template v-if="mode === 'once'">
          <Label>Date</Label>
          <Calendar v-model="calDate" class="self-center" />
        </template>
        <div v-else-if="mode === 'daily'" class="flex:col gap-2">
          <Label>Every N days (interval)</Label>
          <Input v-model.number="dailyInterval as unknown as string" type="number" min="1" class="w-32" />
        </div>
        <div v-else class="flex:col gap-2">
          <Label>Every N weeks (interval)</Label>
          <Input v-model.number="weeklyInterval as unknown as string" type="number" min="1" class="w-32" />
          <Label>Weekdays</Label>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(label, i) in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
              :key="i"
              class="flex:row items-center gap-1.5"
            >
              <Checkbox :id="`wd-${i}`" v-model:checked="weekdayToggles[i]" />
              <Label :for="`wd-${i}`" class="text-xs">{{ label }}</Label>
            </div>
          </div>
        </div>
        <div class="flex:col gap-2">
          <Label>Time (local)</Label>
          <Input v-model="timeStr" type="time" class="w-40" />
        </div>
        <p v-if="summary" class="text-xs text-muted-foreground">Preview: {{ summary }}</p>
        <div class="flex:row justify-end gap-2">
          <Button variant="outline" @click="close">Cancel</Button>
          <Button :disabled="!preview" @click="onConfirm">Use schedule</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
