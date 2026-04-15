<script setup lang="ts">
import { Button, Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/design-system";
import { IconChannel } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { useChannel, useChannels } from "@/domain/channels";
import CreateChannel from "../CreateChannel.vue";
import ChannelContextMenu from "../ChannelContextMenu.vue";
import ChannelContextMenuProvider from "../ChannelContextMenuProvider.vue";
import InboxMessage from "../InboxMessage.vue";

const props = defineProps<{
  class?: string;
}>();

const { channel: currentChannel } = useChannel();
const { channels } = useChannels();
</script>

<template>
  <div value="messages" :class="cn('flex:col-md flex-1 m-2', props.class)">
    <ChannelContextMenuProvider>
      <ChannelContextMenu v-for="channel of channels" :key="channel.id" :channel="channel">
        <InboxMessage :channel="channel" :open="channel.id === currentChannel?.id" />
      </ChannelContextMenu>
    </ChannelContextMenuProvider>

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
  </div>
</template>
