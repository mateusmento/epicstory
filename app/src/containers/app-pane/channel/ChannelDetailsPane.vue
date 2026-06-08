<script lang="ts" setup>
import { useConfirmDialog } from "@/presentationals/confirm-dialog";
import ChannelDetailsPaneView from "@/presentationals/app-pane/channel/ChannelDetailsPane.vue";
import { useAuth } from "@/domain/auth";
import { useChannel } from "@/domain/channels";
import { useDependency } from "@/core/dependency-injection";
import type { UploadedAttachment } from "@epicstory/contracts";
import { ChannelApi } from "@epicstory/api-client";
import { ref, watch } from "vue";
import ChannelSchedulesTab from "./ChannelSchedulesTab.vue";

const { user } = useAuth();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { members, addMember, removeMember, channel } = useChannel();

const channelApi = useDependency(ChannelApi);
const confirmDialog = useConfirmDialog();
const channelFiles = ref<UploadedAttachment[]>([]);
const channelFilesLoading = ref(false);
const channelFilesError = ref<string | null>(null);
const removingChannelFileId = ref<number | null>(null);

watch(
  () => channel.value?.id,
  async (id) => {
    if (id == null) {
      channelFiles.value = [];
      return;
    }
    channelFilesLoading.value = true;
    channelFilesError.value = null;
    try {
      channelFiles.value = await channelApi.listChannelAttachments(id);
    } catch {
      channelFiles.value = [];
      channelFilesError.value = "Could not load files";
    } finally {
      channelFilesLoading.value = false;
    }
  },
  { immediate: true },
);

async function removeChannelFile(attachmentId: number) {
  const channelId = channel.value?.id;
  if (channelId == null) return;
  const confirmed = await confirmDialog.open({
    title: "Remove this attachment?",
    description: "The file will be permanently deleted from this channel.",
    confirmLabel: "Remove",
    cancelLabel: "Cancel",
    destructive: true,
  });
  if (!confirmed) return;
  removingChannelFileId.value = attachmentId;
  channelFilesError.value = null;
  try {
    await channelApi.deleteChannelAttachment(channelId, attachmentId);
    channelFiles.value = channelFiles.value.filter((a) => a.id !== attachmentId);
  } catch {
    channelFilesError.value = "Could not remove file";
    try {
      channelFiles.value = await channelApi.listChannelAttachments(channelId);
    } catch {
      /* keep stale list */
    }
  } finally {
    removingChannelFileId.value = null;
  }
}
</script>

<template>
  <ChannelDetailsPaneView
    :channel-id="channel?.id"
    :me-id="user?.id"
    :members
    :channel-files="channelFiles"
    :channel-files-loading="channelFilesLoading"
    :channel-files-error="channelFilesError"
    :removing-channel-file-id="removingChannelFileId"
    @add-member="addMember"
    @remove-member="removeMember"
    @remove-file="removeChannelFile"
    @close="emit('close')"
  >
    <template #schedules>
      <ChannelSchedulesTab :channel-id="channel?.id" :members="members" />
    </template>
  </ChannelDetailsPaneView>
</template>
