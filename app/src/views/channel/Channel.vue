<script lang="ts" setup>
import Chatbox from "@/design-system/channel/Chatbox.vue";
import { useAuth } from "@/domain/auth";
import { useChannel } from "@/domain/channels";
import { onMounted, watch } from "vue";

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
  <Chatbox v-if="user" :message-groups="messageGroups" :me-id="user.id" />
</template>
