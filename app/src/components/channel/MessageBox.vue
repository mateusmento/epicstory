<script lang="ts" setup>
import IconEmoji from "@/design-system/icons/IconEmoji.vue";
import { cva } from "class-variance-authority";
import { inject, ref, onMounted, onUnmounted, watch } from "vue";
import { Button } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { useDependency } from "@/core/dependency-injection";
import { ChannelApi } from "@/domain/channels/services/channel.service";
import { useWebSockets } from "@/core/websockets";
import { formatDistanceToNow } from "date-fns";
import type { IMessage } from "@/domain/channels/types";
import EmojiPicker from "./EmojiPicker.vue";

const props = defineProps<{
  content: string;
  messageId: number;
  channelId: number;
}>();

const isDiscussionOpen = ref(false);
const replies = ref<IMessage[]>([]);
const replyContent = ref("");
const isLoadingReplies = ref(false);

const channelApi = useDependency(ChannelApi);
const { websocket } = useWebSockets();

function useMessageGroup() {
  const context = inject<{ meId: number; sender: "me" | "someoneElse" }>("messageGroup");
  if (!context) throw new Error("MessageGroup not provided. Use MessageBox inside a MessageGroup.");
  return context;
}

const { sender, meId } = useMessageGroup();

async function toggleDiscussion() {
  isDiscussionOpen.value = !isDiscussionOpen.value;
  if (isDiscussionOpen.value && replies.value.length === 0) {
    await fetchReplies();
  }
}

async function fetchReplies() {
  if (isLoadingReplies.value) return;
  isLoadingReplies.value = true;
  try {
    replies.value = await channelApi.findReplies(props.channelId, props.messageId);
    // Fetch reactions for each reply
    for (const reply of replies.value) {
      await fetchReplyReactions(reply.id);
    }
  } catch (error) {
    console.error("Failed to fetch replies:", error);
  } finally {
    isLoadingReplies.value = false;
  }
}

async function onIncomingReply({ message, parentMessageId }: { message: IMessage; parentMessageId: number }) {
  if (parentMessageId === props.messageId) {
    replies.value.push(message);
    // Fetch reactions for the new reply
    await fetchReplyReactions(message.id);
  }
}

async function sendReply() {
  if (!replyContent.value.trim()) return;

  try {
    // Send via WebSocket for real-time updates
    websocket?.emit("send-message", {
      channelId: props.channelId,
      message: { content: replyContent.value },
      parentMessageId: props.messageId,
      broadcastSelf: true,
    });
    replyContent.value = "";
  } catch (error) {
    console.error("Failed to send reply:", error);
  }
}

function formatTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// Subscribe to incoming replies
onMounted(() => {
  websocket?.off("incoming-reply", onIncomingReply);
  websocket?.on("incoming-reply", onIncomingReply);
});

onUnmounted(() => {
  websocket?.off("incoming-reply", onIncomingReply);
});

watch(
  () => props.messageId,
  () => {
    replies.value = [];
    if (isDiscussionOpen.value) {
      fetchReplies();
    }
  },
);

type Reaction = {
  emoji: string;
  reactedBy: number[];
};

const reactions = ref<Reaction[]>([]);
const replyReactions = ref<Record<number, Reaction[]>>({});

onMounted(() => {
  fetchReactions();
  websocket?.off("incoming-reaction", onIncomingReaction);
  websocket?.on("incoming-reaction", onIncomingReaction);
});

onUnmounted(() => {
  websocket?.off("incoming-reaction", onIncomingReaction);
});

function onIncomingReaction({
  messageId,
  messageReplyId,
  reactions: updatedReactions,
}: {
  messageId?: number;
  messageReplyId?: number;
  reactions?: Reaction[];
}) {
  if (messageId === props.messageId && updatedReactions) {
    reactions.value = updatedReactions;
  } else if (messageReplyId && updatedReactions) {
    replyReactions.value[messageReplyId] = updatedReactions;
  }
}

async function fetchReactions() {
  try {
    reactions.value = await channelApi.findReactions(props.channelId, props.messageId);
  } catch (error) {
    console.error("Failed to fetch reactions:", error);
  }
}

async function fetchReplyReactions(replyId: number) {
  try {
    replyReactions.value[replyId] = await channelApi.findReplyReactions(
      props.channelId,
      props.messageId,
      replyId,
    );
  } catch (error) {
    console.error("Failed to fetch reply reactions:", error);
  }
}

function toggleReaction(emoji: string) {
  websocket?.emit("toggle-reaction", {
    messageId: props.messageId,
    emoji: emoji,
    channelId: props.channelId,
  });
}

function toggleReplyReaction(replyId: number, emoji: string) {
  websocket?.emit("toggle-reaction", {
    messageReplyId: replyId,
    emoji: emoji,
    channelId: props.channelId,
  });
}

function onEmojiSelect(emoji: string) {
  toggleReaction(emoji);
}

function onReplyEmojiSelect(replyId: number, emoji: string) {
  toggleReplyReaction(replyId, emoji);
}
</script>

<template>
  <div class="group flex:row-lg flex:center-y">
    <Button variant="ghost" size="icon">
      <Icon
        v-if="!isDiscussionOpen"
        name="hi-reply"
        class="w-4 h-4 group-hover:visible invisible text-secondary-foreground"
        @click="toggleDiscussion"
      />
    </Button>
    <div class="flex:col-lg bg-[#F9F9F9] border border-[#E4E4E4] rounded-2xl relative">
      <div :class="styles.messageBox({ sender })">
        {{ content }}
        <div class="" :class="styles.emoji({ sender })">
          <IconEmoji />
        </div>
      </div>

      <div class="flex:col-xl p-2 pt-0" v-if="isDiscussionOpen">
        <div class="flex:row-2xl flex:center-y">
          <div class="flex:row-md flex:center-y">
            <Button
              v-for="reaction in reactions"
              :key="reaction.emoji"
              variant="outline"
              size="icon"
              @click="toggleReaction(reaction.emoji)"
              class="border py-0.5 px-2 pr-3 rounded-full border-color-[#686870] bg-white text-sm font-lato text-[#686870]"
            >
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
            <div v-for="reply in replies" :key="reply.id" class="flex:row-md">
              <img
                v-if="reply.sender.picture"
                :src="reply.sender.picture"
                :alt="reply.sender.name"
                class="w-10 h-10 rounded-full flex-shrink-0"
              />
              <div
                v-else
                class="w-10 h-10 rounded-full flex-shrink-0 bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold"
              >
                {{ reply.sender.name.charAt(0).toUpperCase() }}
              </div>
              <div class="flex:col-md flex-1 min-w-0">
                <div class="flex:row-md flex:center-y">
                  <div class="text-foreground font-lato font-semibold">{{ reply.sender.name }}</div>
                  <div class="ml-auto text-[#686870] font-dmSans text-xs">{{ formatTime(reply.sentAt) }}</div>
                </div>
                <div class="text-[15px] font-lato">{{ reply.content }}</div>
                <div class="flex:row-md flex:center-y mt-1">
                  <Button
                    v-for="reaction in replyReactions[reply.id]"
                    :key="reaction.emoji"
                    variant="outline"
                    size="icon"
                    @click="toggleReplyReaction(reply.id, reaction.emoji)"
                    class="border py-0.5 px-2 pr-3 rounded-full border-color-[#686870] bg-white text-sm font-lato text-[#686870]"
                  >
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
              class="flex:row flex:center-y flex-1 h-10 py-4 px-4 bg-white text-[#686870] border border-[#E4E4E4] rounded-xl focus-within:ring-1 focus-within:ring-ring focus-within:ring-zinc-300"
            >
              <input
                v-model="replyContent"
                placeholder="Reply..."
                class="mr-auto p-0 h-fit outline-none border-none font-lato placeholder:font-lato placeholder:text-[15px] text-[15px] flex-1"
                @keydown.enter="sendReply"
              />

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
            <Button
              variant="ghost"
              class="flex:row flex:center bg-[#3A66FF] w-10 h-10 gap-2 rounded-lg text-white"
              @click="sendReply"
              :disabled="!replyContent.trim()"
            >
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
