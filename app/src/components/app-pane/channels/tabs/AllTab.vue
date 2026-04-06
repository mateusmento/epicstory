<script setup lang="ts">
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/design-system";
import { cn } from "@/design-system/utils";
import { useChannel, useChannels, useMeeting } from "@/domain/channels";
import { HashIcon, HeadphonesIcon, LogOutIcon, SquarePenIcon, Trash2Icon } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{
  class?: string;
}>();

const { openChannel } = useChannel();
const { channels } = useChannels();
const { joinMeeting } = useMeeting();

const items = computed(() => [
  {
    title: "Channels",
    items: channels.value.filter((channel) => channel.type === "group"),
  },
  {
    title: "Meetings",
    items: channels.value.filter((channel) => channel.type === "meeting"),
  },
  {
    title: "Direct messages",
    items: channels.value.filter((channel) => channel.type === "direct" || channel.type === "multi-direct"),
  },
]);
</script>

<template>
  <div :class="cn('flex:col-md m-2 flex-1', props.class)">
    <template v-for="item in items" :key="item.title">
      <div class="text-xs text-secondary-foreground mt-2 ml-2">{{ item.title }}</div>

      <Menu v-for="channel of item.items" :key="channel.id" type="context-menu">
        <MenuTrigger>
          <div
            v-if="!channel.meeting"
            class="flex:row-lg flex:center-y flex-1 p-2 rounded-lg hover:bg-secondary cursor-pointer"
            @click="openChannel(channel)"
          >
            <img
              v-if="channel.speakingTo?.picture"
              :src="channel.speakingTo?.picture"
              class="w-4 h-4 rounded-full"
            />
            <HashIcon v-else class="h-4 w-4 text-muted-foreground" stroke-width="2.5" />
            <div class="text-xs">{{ channel.name || channel.speakingTo.name }}</div>
          </div>
          <div v-else class="flex:row-sm">
            <div
              class="flex:row-lg flex:center-y flex-1 p-2 rounded-lg hover:bg-secondary cursor-pointer"
              @click="openChannel(channel)"
            >
              <img
                v-if="channel.speakingTo?.picture"
                :src="channel.speakingTo?.picture"
                class="w-4 h-4 rounded-full"
              />
              <HashIcon v-else class="h-4 w-4 text-muted-foreground" stroke-width="2.5" />
              <div class="text-xs">{{ channel.name || channel.speakingTo.name }}</div>
            </div>
            <div
              class="p-2 rounded-lg hover:bg-secondary cursor-pointer"
              @click="joinMeeting({ meetingId: channel.meeting.id })"
            >
              <!-- <HeadphonesIcon class="w-4 h-4 text-muted-foreground" /> -->
              <HeadphonesIcon class="h-4 w-4 text-muted-foreground" stroke-width="2.5" />
            </div>
          </div>
        </MenuTrigger>
        <MenuContent>
          <MenuItem class="text-xs">
            <SquarePenIcon scale="1.2" />
            <div>Rename</div>
          </MenuItem>
          <MenuItem class="text-xs">
            <LogOutIcon scale="1.2" />
            <div>Leave channel</div>
          </MenuItem>
          <MenuSeparator />
          <MenuItem variant="destructive" class="text-xs">
            <Trash2Icon name="fa-trash" scale="1.2" />
            <div>Delete channel</div>
          </MenuItem>
        </MenuContent>
      </Menu>
    </template>
  </div>
</template>
