<script lang="ts" setup>
import MessageGroup from "./MessageGroup.vue";
import type { IMessageGroup } from "./message-group.type";

const props = defineProps<{
  meId: number;
  messageGroups: IMessageGroup[];
}>();
</script>

<template>
  <div>
    <MessageGroup v-for="group of messageGroups" :key="group.id" :message-group="group" :me-id="meId" />
  </div>
</template>
