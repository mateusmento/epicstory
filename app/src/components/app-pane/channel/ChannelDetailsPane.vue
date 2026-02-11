<script lang="ts" setup>
import { useChannel } from "@/domain/channels";
import ChannelDetailsPaneTemplate from "./ChannelDetailsPaneTemplate.vue";

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { members, addMember, removeMember } = useChannel();
</script>

<template>
  <ChannelDetailsPaneTemplate
    :members
    @add-member="addMember"
    @remove-member="removeMember"
    @close="emit('close')"
  />
</template>
