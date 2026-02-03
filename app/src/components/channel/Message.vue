<script lang="ts" setup>
import { useNavTrigger } from "@/design-system";
import { useMessageThread } from "@/domain/channels/composables/message-thread";
import type { IMessage } from "@/domain/channels/types";
import MessageBox from "./MessageBox.vue";

const props = defineProps<{
  meId: number;
}>();

const message = defineModel<IMessage>("message", { required: true });

const emit = defineEmits(["message-deleted"]);

const {
  toggleReaction,
} = useMessageThread(message, { name: "message" });

const { viewContent } = useNavTrigger("details-pane");

async function toggleDiscussion() {
  viewContent('replies', { message: message.value, meId: props.meId });
}

function onEmojiSelect(emoji: string) {
  toggleReaction(emoji);
}

function onMessageDeleted() {
  emit("message-deleted", message.value?.id);
}
</script>

<template>
  <MessageBox :message="message" :meId="meId" @discussion-opened="toggleDiscussion" @reaction-toggled="onEmojiSelect"
    @message-deleted="onMessageDeleted" />
</template>
