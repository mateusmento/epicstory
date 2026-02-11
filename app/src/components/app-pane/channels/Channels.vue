<script setup lang="ts">
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system";
import { Icon, IconChannel } from "@/design-system/icons";
import { useChannel, useMeeting, useSyncedChannels } from "@/domain/channels";
import { SquarePen } from "lucide-vue-next";
import CreateChannel from "./CreateChannel.vue";
import InboxMessage from "./InboxMessage.vue";

const { channel: currentChannel } = useChannel();
const { channels } = useSyncedChannels();
const { currentMeeting, joinMeeting } = useMeeting();
</script>

<template>
  <div class="flex:col h-full w-96">
    <div class="flex:row-auto flex:center-y h-14 p-4">
      <div class="flex:row-sm flex:center-y font-semibold text-foreground">
        <Icon name="fa-slack-hash" scale="1.2" />
        Channels
      </div>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon">
            <SquarePen class="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent> Write a new message </TooltipContent>
      </Tooltip>
    </div>

    <Separator />

    <div class="flex:col flex-1">
      <div class="flex:col-md m-2">
        <InboxMessage
          v-for="channel of channels"
          :key="channel.id"
          :channel="channel"
          :can-join-meeting="!!channel.meeting && channel.meeting.id !== currentMeeting?.id"
          @join-meeting="joinMeeting(channel)"
          :open="channel.id === currentChannel?.id"
        />

        <div class="w-fit mt-4 mx-auto text-xs text-secondary-foreground">You have no more messages</div>
      </div>

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
    </div>
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
