<script lang="ts" setup>
import { useAuth } from "@/domain/auth";
import { useChannel } from "@/domain/channels";
import ChannelDetailsPaneTemplate from "./ChannelDetailsPaneTemplate.vue";

const { user } = useAuth();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { members, addMember, removeMember, channel } = useChannel();
</script>

<template>
  <ChannelDetailsPaneTemplate
    :channel-id="channel?.id"
    :me-id="user?.id"
    :members
    @add-member="addMember"
    @remove-member="removeMember"
    @close="emit('close')"
  />
</template>
