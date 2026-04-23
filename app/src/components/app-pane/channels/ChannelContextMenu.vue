<script setup lang="ts">
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/design-system";
import type { IChannel } from "@/domain/channels/types";
import { inject } from "vue";
import { CalendarClockIcon, HeadphonesIcon, LogOutIcon, SquarePenIcon, Trash2Icon } from "lucide-vue-next";
import { CHANNEL_CONTEXT_MENU_KEY } from "./channel-context-menu.context";

const { channel } = defineProps<{
  channel: IChannel;
}>();

const ctx = inject(CHANNEL_CONTEXT_MENU_KEY);
if (!ctx) {
  throw new Error("ChannelContextMenu must be used inside ChannelContextMenuProvider");
}

const { actionLoading, openRename, openDelete, leaveChannel, scheduleMeeting, startMeeting } = ctx;
</script>

<template>
  <Menu type="context-menu">
    <MenuTrigger>
      <slot />
    </MenuTrigger>
    <MenuContent class="text-sm font-dmSans">
      <MenuItem @click="openRename(channel)" :disabled="channel.type === 'direct'">
        <SquarePenIcon class="size-3.5 shrink-0 text-muted-foreground" stroke-width="2.5" />
        <div>Rename</div>
      </MenuItem>
      <MenuItem @click="leaveChannel(channel)" :disabled="actionLoading">
        <LogOutIcon class="size-3.5 shrink-0 text-muted-foreground" stroke-width="2.5" />
        <div>Leave channel</div>
      </MenuItem>
      <MenuSeparator />
      <MenuItem @click="scheduleMeeting(channel)">
        <CalendarClockIcon class="size-3.5 shrink-0 text-muted-foreground" stroke-width="2.5" />
        <div>Schedule meeting</div>
      </MenuItem>
      <MenuItem @click="startMeeting(channel)">
        <HeadphonesIcon class="size-3.5 shrink-0 text-muted-foreground" stroke-width="2.5" />
        <div>Start meeting</div>
      </MenuItem>
      <MenuSeparator />
      <MenuItem variant="destructive" @click="openDelete(channel)" :disabled="actionLoading">
        <Trash2Icon class="size-3.5 shrink-0" stroke-width="2.5" />
        <div>Delete channel</div>
      </MenuItem>
    </MenuContent>
  </Menu>
</template>
