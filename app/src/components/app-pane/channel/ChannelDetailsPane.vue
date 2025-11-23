<script lang="ts" setup>
import { useChannel } from "@/domain/channels";
import ChannelDetailsPaneTemplate from "./ChannelDetailsPaneTemplate.vue";

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { members, addMember, removeMember } = useChannel();
</script>

<template>
  <aside class="flex:col-4xl h-full w-96 p-4 border-l border-zinc-300/60">
    <ChannelDetailsPaneTemplate
      :members
      @add-member="addMember"
      @remove-member="removeMember"
      @close="emit('close')"
    />
  </aside>
</template>
