<script lang="ts" setup>
import Chatbox from "@/design-system/channel/Chatbox.vue";
import { useAuth } from "@/domain/auth";
import { useChannel } from "@/domain/channels";
import { onMounted, watch } from "vue";
import Scrollable from "../derbel/channel/Scrollable.vue";

const { user } = useAuth();
const { channel, messageGroups, fetchMessages, joinChannel } = useChannel();

onMounted(async () => {
  joinChannel();
  fetchMessages();
});

watch(channel, () => {
  joinChannel();
  fetchMessages();
});
</script>

<template>
  <Scrollable class="p-4 h-full">
    <Chatbox v-if="user" :message-groups="messageGroups" :me-id="user.id" />
  </Scrollable>
</template>
