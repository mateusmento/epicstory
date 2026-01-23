<script lang="ts" setup>
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useAuth } from "@/domain/auth";
import { useMessageThread } from "@/domain/channels/composables/message-thread";
import type { IMessage } from "@/domain/channels/types";
import { DotsHorizontalIcon } from "@radix-icons/vue";
import { cva } from "class-variance-authority";
import { formatDistanceToNow } from "date-fns";
import { inject, ref, watch, type Ref } from "vue";
import EmojiPicker from "./EmojiPicker.vue";

const props = defineProps<{
  content: string;
  messageId: number;
  channelId: number;
}>();

const emit = defineEmits(["message-deleted"]);

const message = ref<IMessage>({
  id: props.messageId,
  content: props.content,
} as IMessage);

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
} = useMessageThread(message as Ref<IMessage>);

const { sender } = useMessageGroup();
const { user: me } = useAuth();

function useMessageGroup() {
  const context = inject<{ meId: number; sender: "me" | "someoneElse" }>("messageGroup");
  if (!context) throw new Error("MessageGroup not provided. Use MessageBox inside a MessageGroup.");
  return context;
}

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
  <div class="group flex:row-lg flex:center-y">
    <Button variant="ghost" size="icon">
      <Icon v-if="!isDiscussionOpen" name="hi-reply"
        class="w-4 h-4 group-hover:visible invisible text-secondary-foreground" @click="toggleDiscussion" />
    </Button>
    <div class="flex:col-lg bg-[#F9F9F9] border border-[#E4E4E4] rounded-2xl relative group/message">
      <div :class="styles.messageBox({ sender })">
        {{ content }}
        <div class="" :class="styles.emoji({ sender })">
          <DropdownMenu v-if="sender === 'me'">
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" class="opacity-0 group-hover/message:opacity-100 transition-opacity">
                <DotsHorizontalIcon class="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="onDeleteMessage" variant="destructive">
                <span>Delete message</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div class="flex:col-xl p-2 pt-0" v-if="isDiscussionOpen">
        <div class="flex:row-2xl flex:center-y">
          <div class="flex:row-md flex:center-y">
            <Button v-for="reaction in reactions" :key="reaction.emoji" variant="outline" size="icon"
              @click="toggleReaction(reaction.emoji)"
              class="border py-0.5 px-2 pr-3 rounded-full border-color-[#686870] bg-white text-sm font-lato text-[#686870]">
              {{ reaction.emoji }} {{ reaction.reactedBy.length }}
            </Button>

            <EmojiPicker @select="onEmojiSelect" />
          </div>

          <Button variant="ghost" size="icon" class="text-xs text-[#686870]" @click="toggleDiscussion">
            {{ isDiscussionOpen ? "Hide discussion" : "Show discussion" }}
          </Button>
        </div>

        <template v-if="isDiscussionOpen">
          <div v-if="replies.length > 0" class="px-2 space-y-3">
            <div v-for="reply in replies" :key="reply.id" class="flex:row-md group/reply">
              <img v-if="reply.sender.picture" :src="reply.sender.picture" :alt="reply.sender.name"
                class="w-10 h-10 rounded-full flex-shrink-0" />
              <div v-else
                class="w-10 h-10 rounded-full flex-shrink-0 bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold">
                {{ reply.sender.name.charAt(0).toUpperCase() }}
              </div>
              <div class="flex:col-md flex-1 min-w-0">
                <div class="flex:row-md flex:center-y">
                  <div class="text-foreground font-lato font-semibold">{{ reply.sender.name }}</div>
                  <div class="ml-auto flex items-center gap-2">
                    <span
                      class="text-[#686870] font-dmSans text-xs opacity-100 group-hover/reply:opacity-0 transition-opacity">
                      {{ formatTime(reply.sentAt) }}
                    </span>
                    <DropdownMenu v-if="reply.senderId === me?.id">
                      <DropdownMenuTrigger as-child>
                        <Button variant="ghost" size="icon"
                          class="opacity-0 group-hover/reply:opacity-100 transition-opacity h-auto p-1">
                          <DotsHorizontalIcon class="w-4 h-4 text-[#686870]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click="deleteReply(reply.id)" variant="destructive">
                          <span>Delete reply</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div class="text-[15px] font-lato">{{ reply.content }}</div>
                <div class="flex:row-md flex:center-y mt-1">
                  <Button v-for="reaction in replyReactions[reply.id]" :key="reaction.emoji" variant="outline"
                    size="icon" @click="toggleReplyReaction(reply.id, reaction.emoji)"
                    class="border py-0.5 px-2 pr-3 rounded-full border-color-[#686870] bg-white text-sm font-lato text-[#686870]">
                    {{ reaction.emoji }} {{ reaction.reactedBy.length }}
                  </Button>
                  <EmojiPicker @select="(emoji) => onReplyEmojiSelect(reply.id, emoji)" size="icon" />
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="isLoadingReplies" class="px-2 text-sm text-[#686870]">Loading replies...</div>
          <div v-else class="px-2 text-sm text-[#686870]">No replies yet</div>

          <div class="flex:row-lg">
            <div
              class="flex:row flex:center-y flex-1 h-10 py-4 px-4 bg-white text-[#686870] border border-[#E4E4E4] rounded-xl focus-within:ring-1 focus-within:ring-ring focus-within:ring-zinc-300">
              <input v-model="replyContent" placeholder="Reply..."
                class="mr-auto p-0 h-fit outline-none border-none font-lato placeholder:font-lato placeholder:text-[15px] text-[15px] flex-1"
                @keydown.enter="sendReply" />

              <Button variant="ghost" size="icon">
                <Icon name="bi-camera-video" class="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon">
                <Icon name="bi-mic" class="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon">
                <Icon name="bi-image" class="w-6 h-6" />
              </Button>
              <Button variant="ghost" size="icon">
                <Icon name="ri-attachment-2" class="w-6 h-6" />
              </Button>
            </div>
            <Button variant="ghost" class="flex:row flex:center bg-[#3A66FF] w-10 h-10 gap-2 rounded-lg text-white"
              @click="sendReply" :disabled="!replyContent.trim()">
              <Icon name="io-paper-plane" />
            </Button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
const styles = {
  messageContainer: cva("flex:col-md bg-secondary w-fit min-w-40 max-w-[35rem]", {
    variants: {
      sender: {
        me: "self-end first:rounded-tr-none",
        someoneElse: "first:rounded-tl-none",
      },
    },
  }),
  messageWrapper: cva("flex:row-lg flex:center-y", {
    variants: {
      sender: {
        me: "flex:row-auto flex:center-y",
        someoneElse: "flex:row-auto flex:center-y",
      },
    },
  }),
  messageBox: cva(
    [
      "group",
      "flex:row-auto flex:center-y",
      "min-w-40 max-w-[35rem] px-3 py-1 border border-[#E4E4E4]",
      "first:rounded-t-xl last:rounded-b-xl rounded-lg",
      "shadow-sm text-[15px] font-lato",
    ].join(" "),
    {
      variants: {
        sender: {
          // me: "first:rounded-tr-none text-zinc-50 border-none shadow-none",
          me: "first:rounded-tr-none bg-[#3A66FF] text-zinc-50 border-none shadow-none",
          someoneElse: "first:rounded-tl-none",
        },
      },
    },
  ),
  emoji: cva("p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer", {
    variants: {
      sender: {
        me: "text-zinc-50 ",
        someoneElse: "text-[#686870] hover:bg-secondary",
      },
    },
  }),
};
</script>
