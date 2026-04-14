<script setup lang="ts">
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/design-system";
import type { IChannel } from "@/domain/channels/types";
import {
  CalendarClockIcon,
  HeadphonesIcon,
  LogOutIcon,
  SquarePenIcon,
  Trash2Icon,
} from "lucide-vue-next";

defineProps<{
  channel: IChannel;
  actionLoading: boolean;
}>();

const emit = defineEmits<{
  (e: "rename", channel: IChannel): void;
  (e: "leave", channel: IChannel): void;
  (e: "delete", channel: IChannel): void;
  (e: "schedule-meeting", channel: IChannel): void;
  (e: "start-meeting", channel: IChannel): void;
}>();
</script>

<template>
  <Menu type="context-menu">
    <MenuTrigger>
      <slot />
    </MenuTrigger>
    <MenuContent>
      <MenuItem class="text-xs" @click="emit('rename', channel)" :disabled="channel.type === 'direct'">
        <SquarePenIcon class="h-3.5 w-3.5 shrink-0" stroke-width="2.5" />
        <div>Rename</div>
      </MenuItem>
      <MenuItem class="text-xs" @click="emit('leave', channel)" :disabled="actionLoading">
        <LogOutIcon class="h-3.5 w-3.5 shrink-0" stroke-width="2.5" />
        <div>Leave channel</div>
      </MenuItem>
      <MenuSeparator />
      <MenuItem class="text-xs" @click="emit('schedule-meeting', channel)">
        <CalendarClockIcon class="h-3.5 w-3.5 shrink-0" stroke-width="2.5" />
        <div>Schedule meeting</div>
      </MenuItem>
      <MenuItem class="text-xs" @click="emit('start-meeting', channel)">
        <HeadphonesIcon class="h-3.5 w-3.5 shrink-0" stroke-width="2.5" />
        <div>Start meeting</div>
      </MenuItem>
      <MenuSeparator />
      <MenuItem
        variant="destructive"
        class="text-xs"
        @click="emit('delete', channel)"
        :disabled="actionLoading"
      >
        <Trash2Icon class="h-3.5 w-3.5 shrink-0" stroke-width="2.5" />
        <div>Delete channel</div>
      </MenuItem>
    </MenuContent>
  </Menu>
</template>
