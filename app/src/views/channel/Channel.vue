<script lang="ts" setup>
import Chatbox from "@/design-system/channel/Chatbox.vue";
import { useAuth } from "@/domain/auth";
import { useChannel } from "@/domain/channels";
import { onMounted } from "vue";

const { user } = useAuth();
const { messageGroups, fetchMessages, joinChannel } = useChannel();

onMounted(async () => {
  joinChannel();
  fetchMessages();
});
</script>

<template>
  <div class="p-4">
    <Chatbox v-if="user" :message-groups="messageGroups" :me-id="user.id" />
  </div>
</template>
