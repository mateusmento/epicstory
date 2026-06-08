<script lang="ts" setup>
import { useNavTrigger } from "@/design-system";
import { useChannel, useMessageThread } from "@/domain/channels";
import type { IMessage } from "@epicstory/contracts";
import MessageBox from "@/presentationals/messages/MessageBox.vue";
import { computed } from "vue";

const props = defineProps<{
  meId: number;
}>();

const message = defineModel<IMessage>("message", { required: true });

const emit = defineEmits(["message-deleted", "quote", "start-edit"]);

const { toggleReaction } = useMessageThread(message);
const { voteMessagePoll, votingPollMessageId, votingPollOptionId } = useChannel();

const pollVotingOptionId = computed(() =>
  votingPollMessageId.value === message.value.id ? votingPollOptionId.value : null,
);

const { viewContent } = useNavTrigger("details-pane");

async function toggleDiscussion() {
  viewContent("replies", { message: message.value, meId: props.meId });
}

function onEmojiSelect(emoji: string) {
  toggleReaction(emoji);
}

function onMessageDeleted() {
  emit("message-deleted", message.value?.id);
}

async function onPollVoted(optionId: string) {
  const poll = await voteMessagePoll(message.value.id, optionId);
  if (poll) message.value = { ...message.value, poll };
}
</script>

<template>
  <MessageBox
    :message="message"
    :meId="meId"
    :poll-voting-option-id="pollVotingOptionId"
    @discussion-opened="toggleDiscussion"
    @reaction-toggled="onEmojiSelect"
    @message-deleted="onMessageDeleted"
    @quote="emit('quote', $event)"
    @edit="emit('start-edit', $event)"
    @poll-voted="onPollVoted"
  />
</template>
