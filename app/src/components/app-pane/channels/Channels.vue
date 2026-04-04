<script setup lang="ts">
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system";
import { Icon, IconChannel } from "@/design-system/icons";
import { useChannel, useMeeting, useSyncedChannels } from "@/domain/channels";
import { HashIcon, HeadphonesIcon, LogOutIcon, SquarePen, SquarePenIcon, Trash2Icon } from "lucide-vue-next";
import CreateChannel from "./CreateChannel.vue";
import InboxMessage from "./InboxMessage.vue";

const { channel: currentChannel, openChannel } = useChannel();
const { channels } = useSyncedChannels();
const { joinMeeting } = useMeeting();
</script>

<template>
  <div class="flex:col h-full w-96">
    <div class="flex:row-auto flex:center-y h-10 p-4">
      <div class="flex:row-sm flex:center-y">
        <Icon name="fa-slack-hash" scale="1.2" />
        <div class="font-medium text-sm">Channels</div>
      </div>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon">
            <SquarePen class="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent> Write a new message </TooltipContent>
      </Tooltip>
    </div>

    <Separator />

    <Tabs default-value="messages" as-child>
      <TabsList class="flex:row mt-2 w-auto mx-2">
        <TabsTrigger value="all" class="text-xs">All</TabsTrigger>
        <TabsTrigger value="messages" class="text-xs">Messages</TabsTrigger>
      </TabsList>
      <TabsContent value="all" class="flex:col-md m-2 flex-1">
        <div class="text-xs text-secondary-foreground mt-2 ml-2">Channels</div>

        <Menu v-for="channel of channels" :key="channel.id" type="context-menu">
          <MenuTrigger>
            <div
              class="flex:row-lg flex:center-y p-2 rounded-lg hover:bg-secondary cursor-pointer"
              @click="openChannel(channel)"
            >
              <HashIcon class="h-4 w-4 text-muted-foreground" stroke-width="2.5" />
              <div class="text-xs">{{ channel.name || channel.speakingTo.name }}</div>
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

        <div class="text-xs text-secondary-foreground mt-2 ml-2">Meetings</div>

        <div
          v-for="channel of channels.filter((channel) => channel.type !== 'direct')"
          :key="channel.id"
          class="flex:row-lg flex:center-y p-2 rounded-lg hover:bg-secondary cursor-pointer"
          @click="openChannel(channel)"
        >
          <HeadphonesIcon class="h-4 w-4 text-muted-foreground" stroke-width="2.5" />
          <div class="text-xs">{{ channel.name || channel.speakingTo.name }}</div>
        </div>

        <div class="text-xs text-secondary-foreground mt-2 ml-2">Direct messages</div>

        <template
          v-for="channel of channels.filter((channel) => channel.type === 'direct')"
          :key="channel.id"
        >
          <div
            v-if="!channel.meeting"
            class="flex:row-lg flex:center-y p-2 rounded-lg hover:bg-secondary cursor-pointer"
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
              <HeadphonesIcon class="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </template>
      </TabsContent>
      <TabsContent value="messages" class="flex:col-md flex-1 m-2">
        <Menu v-for="channel of channels" :key="channel.id" type="context-menu">
          <MenuTrigger>
            <InboxMessage :channel="channel" :open="channel.id === currentChannel?.id" />
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

        <div class="w-fit mt-4 mx-auto text-xs text-secondary-foreground">You have no more messages</div>

        <Dialog>
          <DialogTrigger as-child>
            <Button
              legacy
              legacy-variant="primary"
              legacy-size="sm"
              class="flex:row-md flex:center-y m-8 mt-auto ml-auto text-sm"
            >
              <IconChannel />
              Create Channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Create channel</DialogTitle>
            <CreateChannel />
          </DialogContent>
        </Dialog>
      </TabsContent>
    </Tabs>
  </div>
</template>

<style scoped>
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  /* transform: translateY(10px); */
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  /* transform: translateY(0); */
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
</style>
