<script lang="ts" setup>
import { Button, ButtonGroup, Menu, MenuContent, MenuItem, MenuTrigger } from "@/design-system";
import { CalendarClockIcon, ChevronDownIcon, HeadphonesIcon } from "lucide-vue-next";

const emit = defineEmits<{
  (e: "join-channel-meeting"): void;
  (e: "start-meeting"): void;
  (e: "schedule-meeting"): void;
}>();
</script>

<template>
  <ButtonGroup class="ml-xl shrink-0">
    <Button
      size="icon"
      variant="outline"
      class="p-1 text-muted-foreground"
      title="Join meeting"
      @click="emit('join-channel-meeting')"
    >
      <HeadphonesIcon class="w-4 h-4" />
    </Button>

    <Menu type="dropdown-menu">
      <MenuTrigger as-child>
        <Button
          size="icon"
          variant="outline"
          class="p-1 text-muted-foreground"
          title="More meeting actions"
          aria-label="More meeting actions"
        >
          <ChevronDownIcon class="w-4 h-4" />
        </Button>
      </MenuTrigger>
      <MenuContent align="end" class="text-xs font-dmSans">
        <MenuItem @click="emit('start-meeting')">
          <HeadphonesIcon class="size-3.5 shrink-0 text-muted-foreground" stroke-width="2.5" />
          <span>Start meeting</span>
        </MenuItem>
        <MenuItem @click="emit('schedule-meeting')">
          <CalendarClockIcon class="size-3.5 shrink-0 text-muted-foreground" stroke-width="2.5" />
          <span>Schedule meeting</span>
        </MenuItem>
      </MenuContent>
    </Menu>
  </ButtonGroup>
</template>
