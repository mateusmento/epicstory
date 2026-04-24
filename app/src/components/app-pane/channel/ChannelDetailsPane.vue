<script lang="ts" setup>
import { useChannel } from "@/domain/channels";
import ChannelDetailsPaneTemplate from "./ChannelDetailsPaneTemplate.vue";

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { members, addMember, removeMember, channel } = useChannel();
</script>

<template>
  <ChannelDetailsPaneTemplate
    :channel-id="channel?.id"
    :members
    @add-member="addMember"
    @remove-member="removeMember"
    @close="emit('close')"
  />
</template>
