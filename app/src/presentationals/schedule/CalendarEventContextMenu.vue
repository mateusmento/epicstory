<script lang="ts" setup>
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/design-system";
import type { ICalendarEvent } from "@epicstory/contracts";

const props = defineProps<{
  event: ICalendarEvent;
}>();

const emit = defineEmits<{
  edit: [event: ICalendarEvent];
  remove: [event: ICalendarEvent];
  openLobby: [event: ICalendarEvent];
}>();

function hasMeetingLobby(event: ICalendarEvent) {
  return Boolean((event.payload as { meetingId?: string })?.meetingId);
}
</script>

<template>
  <Menu type="context-menu">
    <MenuTrigger as-child>
      <slot />
    </MenuTrigger>
    <MenuContent class="w-40">
      <template v-if="props.event.type === 'meeting'">
        <MenuItem v-if="hasMeetingLobby(props.event)" @click="emit('openLobby', props.event)">
          Open lobby
        </MenuItem>
        <MenuItem v-else @click="emit('edit', props.event)">Edit</MenuItem>
        <MenuItem intent="destructive" @click="emit('remove', props.event)"> Cancel series </MenuItem>
      </template>
      <template v-else>
        <MenuItem @click="emit('edit', props.event)">Edit</MenuItem>
        <MenuItem intent="destructive" @click="emit('remove', props.event)">Remove</MenuItem>
      </template>
    </MenuContent>
  </Menu>
</template>
