<script lang="ts" setup>
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/design-system";
import { IconReplies } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { useMessageThread } from "@/domain/channels/composables/message-thread";
import type { IMessage } from "@/domain/channels/types";
import { DotsHorizontalIcon } from "@radix-icons/vue";
import { cva } from "class-variance-authority";
import { formatDistanceToNow } from "date-fns";
import { computed, inject, ref, watch } from "vue";
import EmojiPicker from "./EmojiPicker.vue";

const props = defineProps<{
  meId: number;
}>();

const message = defineModel<IMessage>("message", { required: true });

const emit = defineEmits(["message-deleted"]);

const sender = computed(() => message.value?.senderId === props.meId ? 'me' : 'someoneElse');

const {
  replies,
  reactions,
  replyReactions,
  isLoadingReplies,
  replyContent,
  fetchReplies,
  toggleReaction,
  toggleReplyReaction,
  sendReply,
  deleteReply,
  deleteMessage,
} = useMessageThread(message);

const isDiscussionOpen = ref(false);

watch(
  () => message.value?.id,
  () => {
    replies.value = [];
    if (isDiscussionOpen.value) {
      fetchReplies();
    }
  },
);

async function toggleDiscussion() {
  isDiscussionOpen.value = !isDiscussionOpen.value;
  if (isDiscussionOpen.value && replies.value.length === 0) {
    await fetchReplies();
  }
}

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

function onEmojiSelect(emoji: string) {
  toggleReaction(emoji);
}

function onReplyEmojiSelect(replyId: number, emoji: string) {
  toggleReplyReaction(replyId, emoji);
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
      <div :class="styles.messageActions">
        <Button variant="ghost" size="icon" class="w-8 h-8 text-lg" @click="toggleReaction('👍')">
          👍
        </Button>

        <Button variant="ghost" size="icon" class="w-8 h-8 text-lg" @click="toggleReaction('🙌')">
          🙌
        </Button>

        <EmojiPicker @select="onEmojiSelect" class="w-8 h-8 text-lg" />

        <Button variant="ghost" size="icon" class="w-8 h-8" @click="toggleDiscussion">
          <IconReplies class="w-5 h-5 text-primary/40" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="w-8 h-8">
              <DotsHorizontalIcon class="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem v-if="sender === 'me'" @click="onDeleteMessage" variant="destructive">
              <span>Delete message</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <div v-if="message.reactionsGroups.length > 0" class="flex:row-2xl z-10 flex:center-y ml-lg -mt-2 mb-1">
      <div class="flex:row-md flex:center-y">
        <Button v-for="reaction in message.reactionsGroups" :key="reaction.emoji" variant="outline" size="icon"
          @click="toggleReaction(reaction.emoji)"
          class="border py-0.5 px-2 pr-3 rounded-full border-color-[#686870] bg-white text-sm font-lato text-[#686870]">
          {{ reaction.emoji }} {{ reaction.reactedBy?.length }}
        </Button>

      </div>
    </div>
  </div>
</template>

<script lang="ts">
const styles = {
  messageBox: cn(
    [
      "group",
      "min-w-40 w-fit px-3 py-1.5 pb-2",
      "text-[calc(1rem-1px)] font-lato",
      "rounded-xl",
      "group-hover/message:bg-secondary/20",
      "border border-transparent group-hover/message:border-[#E4E4E4]",
      "group-hover/message:shadow-sm",
      "rounded-tl-none",
    ].join(" "),
  ),
  emoji: cva("p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer", {
    variants: {
      sender: {
        me: "text-zinc-50 ",
        someoneElse: "text-[#686870] hover:bg-secondary",
      },
    },
  }),
  messageActions: cn([
    "flex:row-md flex:center-y w-fit bg-white z-10 opacity-0 group-hover/message:opacity-100 transition-opacity",
    "absolute top-0 right-0 translate-y-[-75%] mr-3",
    "border border-secondary rounded-xl shadow-sm p-md",
  ].join(" "))
};
</script>
