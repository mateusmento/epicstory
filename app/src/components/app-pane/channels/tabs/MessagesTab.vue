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
} from "@/design-system";
import { IconChannel } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { useChannel, useChannels } from "@/domain/channels";
import { LogOutIcon, SquarePenIcon, Trash2Icon } from "lucide-vue-next";
import CreateChannel from "../CreateChannel.vue";
import InboxMessage from "../InboxMessage.vue";

const props = defineProps<{
  class?: string;
}>();

const { channel: currentChannel } = useChannel();
const { channels } = useChannels();
</script>

<template>
  <div value="messages" :class="cn('flex:col-md flex-1 m-2', props.class)">
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
  </div>
</template>
