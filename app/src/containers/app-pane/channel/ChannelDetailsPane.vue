<script lang="ts" setup>
import { useConfirmDialog } from "@/presentationals/confirm-dialog";
import ChannelDetailsPaneView from "@/presentationals/app-pane/channel/ChannelDetailsPane.vue";
import ChannelMembers from "@/presentationals/app-pane/channel/ChannelMembers.vue";
import { WorkspaceMemberDropdown } from "@/containers/workspace-members";
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useChannel, useChannelAttachments } from "@/domain/channels";
import { computed } from "vue";
import ChannelSchedulesTab from "./ChannelSchedulesTab.vue";

const { user } = useAuth();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { members, addMember, removeMember, channel } = useChannel();

const memberIds = computed(() => members.value.map((m) => m.id));
const channelId = computed(() => channel.value?.id);

const channelAttachments = useChannelAttachments(channelId);
const confirmDialog = useConfirmDialog();

async function removeChannelAttachment(attachmentId: number) {
  if (channelId.value == null) return;
  const confirmed = await confirmDialog.open({
    title: "Remove this attachment?",
    description: "The attachment will be permanently deleted from this channel.",
    confirmLabel: "Remove",
    cancelLabel: "Cancel",
    destructive: true,
  });
  if (!confirmed) return;
  await channelAttachments.remove(attachmentId);
}
</script>

<template>
  <ChannelDetailsPaneView
    :channel-id="channel?.id"
    :me-id="user?.id"
    :channel-attachments="channelAttachments.attachments"
    :removing-channel-attachment-id="channelAttachments.removingAttachmentId"
    @remove-attachment="removeChannelAttachment"
    @close="emit('close')"
  >
    <template #members>
      <ChannelMembers :members @remove="removeMember">
        <template #add-member>
          <WorkspaceMemberDropdown :exclude-user-ids="memberIds" @add="(user) => addMember(user.id)">
            <Button variant="ghost" size="icon">
              <Icon name="hi-plus" class="text-secondary-foreground w-4 h-4" />
            </Button>
          </WorkspaceMemberDropdown>
        </template>
      </ChannelMembers>
    </template>
    <template #schedules>
      <ChannelSchedulesTab :channel-id="channel?.id" :members="members" />
    </template>
  </ChannelDetailsPaneView>
</template>
