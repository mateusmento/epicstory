<script setup lang="ts">
import ChannelDeleteDialog from "./ChannelDeleteDialog.vue";
import ChannelRenameDialog from "./ChannelRenameDialog.vue";
import { useChannelActions, useMeeting } from "@/domain/channels";
import type { IChannel } from "@/domain/channels/types";
import { useWorkspace } from "@/domain/workspace";
import { provide, ref } from "vue";
import { useRouter } from "vue-router";
import { CHANNEL_CONTEXT_MENU_KEY, type ChannelContextMenuApi } from "./channel-context-menu.context";

const props = defineProps<{
  /**
   * Optional refresh after leave/rename/delete (e.g. AllTab paginated lists).
   * When omitted, useChannelActions still updates the global channel store.
   */
  refresh?: () => void | Promise<void>;
}>();

const router = useRouter();
const { workspace } = useWorkspace();
const { joinChannelMeeting } = useMeeting();
const channelActions = useChannelActions();

const renamingChannel = ref<IChannel | null>(null);
const deletingChannel = ref<IChannel | null>(null);
const renameOpen = ref(false);
const deleteOpen = ref(false);
const actionLoading = ref(false);

function openRename(channel: IChannel) {
  renamingChannel.value = channel;
  renameOpen.value = true;
}

function openDelete(channel: IChannel) {
  deletingChannel.value = channel;
  deleteOpen.value = true;
}

async function leaveChannel(channel: IChannel) {
  actionLoading.value = true;
  try {
    await channelActions.leaveChannel(channel, { refresh: props.refresh });
  } finally {
    actionLoading.value = false;
  }
}

async function confirmRename(nextName: string) {
  if (!renamingChannel.value) return;
  actionLoading.value = true;
  try {
    await channelActions.renameChannel(renamingChannel.value.id, nextName, { refresh: props.refresh });
  } finally {
    actionLoading.value = false;
  }
}

async function confirmDelete() {
  if (!deletingChannel.value) return;
  actionLoading.value = true;
  try {
    await channelActions.deleteChannel(deletingChannel.value, { refresh: props.refresh });
  } finally {
    actionLoading.value = false;
  }
}

function scheduleMeeting(channel: IChannel) {
  router.push({
    name: "schedule",
    params: { workspaceId: String(workspace.value.id) },
    query: { scheduleChannelId: String(channel.id) },
  });
}

function startMeeting(channel: IChannel) {
  joinChannelMeeting({ channelId: channel.id });
}

const api: ChannelContextMenuApi = {
  actionLoading,
  openRename,
  openDelete,
  leaveChannel,
  scheduleMeeting,
  startMeeting,
};

provide(CHANNEL_CONTEXT_MENU_KEY, api);
</script>

<template>
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

  <slot />
</template>
