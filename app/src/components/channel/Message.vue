<script lang="ts" setup>
import { Button } from "@/design-system";
import { IconReplies } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { useMessageThread } from "@/domain/channels/composables/message-thread";
import type { IMessage } from "@/domain/channels/types";
import { ref } from "vue";
import MessageActions from "./MessageActions.vue";
import ThreadDrawer from "./ThreadDrawer.vue";

const props = defineProps<{
  meId: number;
}>();

const message = defineModel<IMessage>("message", { required: true });

const emit = defineEmits(["message-deleted"]);

const {
  replies,
  fetchReplies,
  toggleReaction,
  deleteMessage,
} = useMessageThread(message);

const isDiscussionOpen = ref(false);

async function toggleDiscussion() {
  isDiscussionOpen.value = !isDiscussionOpen.value;
  if (isDiscussionOpen.value && replies.value.length === 0) {
    await fetchReplies();
  }
}

function onEmojiSelect(emoji: string) {
  toggleReaction(emoji);
}

function onDeleteMessage() {
  deleteMessage();
  emit("message-deleted", message.value?.id);
}
</script>

<template>
  <div class="flex:col relative group/message">

    <div class="flex:row-lg flex:center-y w-fit relative">
      <div :class="styles.messageBox">{{ message.content }}</div>
      <MessageActions :meId="meId" :senderId="message.senderId" @message-deleted="onDeleteMessage"
        @toggle-discussion="toggleDiscussion" @emoji-selected="onEmojiSelect" />
    </div>

    <div v-if="message.reactions.length > 0 || message.replies.count > 0"
      class="flex:row-2xl z-10 flex:center-y ml-lg mt-1 mb-1">

      <div v-if="message.replies.count > 0" variant="outline" size="icon" class="flex:row flex:center-y ml-xl"
        @click="toggleDiscussion">
        <img v-for="replier in message.replies.repliedBy" :key="replier.id" :src="replier.picture"
          class="w-8 h-8 -ml-2 first:ml-0 rounded-full" />
        <span class="flex:row-md ml-xl text-sm text-primary/40">
          <IconReplies class="w-5 h-5 text-primary/40" />
          {{ message.replies.count }} replies
        </span>
      </div>

      <div class="flex:row-md flex:center-y">
        <Button v-for="reaction in message.reactions" :key="reaction.emoji" variant="outline" size="icon"
          @click="toggleReaction(reaction.emoji)"
          class="border py-0.5 px-2 pr-3 rounded-full border-color-[#686870] bg-white text-sm font-lato text-[#686870]">
          {{ reaction.emoji }} {{ reaction.reactedBy?.length }}
        </Button>
      </div>
    </div>

    <ThreadDrawer v-model:open="isDiscussionOpen" v-model:message="message" :meId="meId" />
  </div>
</template>

<script lang="ts">
const styles = {
  messageBox: cn(
    [
      "group",
      "min-w-40 w-fit px-3 py-1.5",
      "text-[calc(1rem-1px)] font-lato",
      "rounded-xl",
      "group-hover/message:bg-secondary/20",
      "border border-transparent group-hover/message:border-[#E4E4E4]",
      "group-hover/message:shadow-sm",
      "rounded-tl-none",
    ].join(" "),
  ),
};
</script>
