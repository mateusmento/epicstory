<script lang="ts" setup>
import Chatbox from "@/design-system/channel/Chatbox.vue";
import { useAuth } from "@/domain/auth";
import { useChannel } from "@/domain/channels";
import { computed, onMounted, watch } from "vue";

const { user } = useAuth();
const { channel, messageGroups, fetchMessages, joinChannel } = useChannel();

const title = computed(() =>
  channel.value?.type === "direct" ? channel.value?.speakingTo.name : channel.value?.name,
);

const picture = computed(() =>
  channel.value?.type === "direct" ? channel.value?.speakingTo.picture : "/images/hashtag.svg",
);

onMounted(async () => {
  joinChannel();
  fetchMessages();
});

watch(
  () => channel.value?.id,
  () => {
    joinChannel();
    fetchMessages();
  },
);
</script>

<template>
  <Chatbox
    v-if="user"
    :chat-title="title"
    :chat-picture="picture"
    :message-groups="messageGroups"
    :me-id="user.id"
  />
</template>
