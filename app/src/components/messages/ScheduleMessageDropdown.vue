<script lang="ts" setup>
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/design-system";
import { CalendarIcon } from "lucide-vue-next";
import { resolveSchedulePreset, type ResolvedSchedule } from "./schedule-builders";

const emit = defineEmits<{
  openCustomScheduleDialog: [];
}>();

const activeSchedule = defineModel<ResolvedSchedule | null>("activeSchedule", {
  required: false,
  default: null,
});

function applyPreset(preset: Parameters<typeof resolveSchedulePreset>[0]) {
  activeSchedule.value = resolveSchedulePreset(preset);
}

function openCustomScheduleDialog() {
  emit("openCustomScheduleDialog");
}
</script>

<template>
  <Menu type="dropdown-menu">
    <MenuTrigger as-child>
      <slot />
    </MenuTrigger>
    <MenuContent align="end" class="min-w-[12rem] font-dmSans">
      <MenuItem @click="applyPreset('in10s')">
        <CalendarIcon class="size-4 text-muted-foreground" />
        <span>In 10 seconds</span>
      </MenuItem>
      <MenuItem @click="applyPreset('in1m')">
        <CalendarIcon class="size-4 text-muted-foreground" />
        <span>In 1 minute</span>
      </MenuItem>
      <MenuSeparator />
      <MenuItem @click="applyPreset('in2h')">
        <CalendarIcon class="size-4 text-muted-foreground" />
        <span>In 2 hours</span>
      </MenuItem>
      <MenuItem @click="applyPreset('tomorrow9')">
        <CalendarIcon class="size-4 text-muted-foreground" />
        <span>Tomorrow at 9 AM</span>
      </MenuItem>
      <MenuItem @click="applyPreset('in2days9')">
        <CalendarIcon class="size-4 text-muted-foreground" />
        <span>In 2 days at 9 AM</span>
      </MenuItem>
      <MenuItem @click="applyPreset('nextMonday9')">
        <CalendarIcon class="size-4 text-muted-foreground" />
        <span>Next Monday at 9 AM</span>
      </MenuItem>
      <MenuItem @click="applyPreset('nextWeek9')">
        <CalendarIcon class="size-4 text-muted-foreground" />
        <span>Next week at 9 AM</span>
      </MenuItem>
      <MenuSeparator />
      <MenuItem @click="openCustomScheduleDialog">
        <CalendarIcon class="size-4 text-muted-foreground" />
        <span>Custom schedule…</span>
      </MenuItem>
    </MenuContent>
  </Menu>
</template>
