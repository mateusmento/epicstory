<script setup lang="ts">
import { Button, Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/design-system";
import { IconChannel } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { useChannel, useChannelActions, useChannels, useMeeting } from "@/domain/channels";
import type { IChannel } from "@/domain/channels/types";
import { useWorkspace } from "@/domain/workspace";
import { ref } from "vue";
import { useRouter } from "vue-router";
import CreateChannel from "../CreateChannel.vue";
import ChannelDeleteDialog from "../ChannelDeleteDialog.vue";
import ChannelRenameDialog from "../ChannelRenameDialog.vue";
import ChannelListContextMenu from "../ChannelListContextMenu.vue";
import InboxMessage from "../InboxMessage.vue";

const props = defineProps<{
  class?: string;
}>();

const router = useRouter();
const { channel: currentChannel } = useChannel();
const { channels } = useChannels();
const { workspace } = useWorkspace();
const { joinChannelMeeting } = useMeeting();

const channelActions = useChannelActions();

const renamingChannel = ref<any | null>(null);
const deletingChannel = ref<any | null>(null);
const renameOpen = ref(false);
const deleteOpen = ref(false);
const actionLoading = ref(false);

function openRename(channel: any) {
  renamingChannel.value = channel;
  renameOpen.value = true;
}

function openDelete(channel: any) {
  deletingChannel.value = channel;
  deleteOpen.value = true;
}

async function leaveChannel(channel: any) {
  actionLoading.value = true;
  try {
    await channelActions.leaveChannel(channel);
  } finally {
    actionLoading.value = false;
  }
}

async function confirmRename(nextName: string) {
  if (!renamingChannel.value) return;
  actionLoading.value = true;
  try {
    await channelActions.renameChannel(renamingChannel.value.id, nextName);
  } finally {
    actionLoading.value = false;
  }
}

async function confirmDelete() {
  if (!deletingChannel.value) return;
  actionLoading.value = true;
  try {
    await channelActions.deleteChannel(deletingChannel.value);
  } finally {
    actionLoading.value = false;
  }
}

function onScheduleMeetingForChannel(channel: IChannel) {
  router.push({
    name: "schedule",
    params: { workspaceId: String(workspace.value.id) },
    query: { scheduleChannelId: String(channel.id) },
  });
}

function onStartMeetingForChannel(channel: IChannel) {
  joinChannelMeeting({ channelId: channel.id });
}
</script>

<template>
  <div value="messages" :class="cn('flex:col-md flex-1 m-2', props.class)">
    <ChannelRenameDialog
      :open="renameOpen"
      :disabled="actionLoading"
      :currentName="renamingChannel?.name ?? ''"
      title="Rename channel"
      placeholder="Channel name"
      @update:open="renameOpen = $event"
      @confirm="confirmRename"
    />

    <ChannelDeleteDialog
      :open="deleteOpen"
      :disabled="actionLoading"
      :title="deletingChannel?.name ?? ''"
      @update:open="deleteOpen = $event"
      @confirm="confirmDelete"
    />

    <ChannelListContextMenu
      v-for="channel of channels"
      :key="channel.id"
      :channel="channel"
      :action-loading="actionLoading"
      @rename="openRename"
      @leave="leaveChannel"
      @delete="openDelete"
      @schedule-meeting="onScheduleMeetingForChannel"
      @start-meeting="onStartMeetingForChannel"
    >
      <InboxMessage :channel="channel" :open="channel.id === currentChannel?.id" />
    </ChannelListContextMenu>

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
