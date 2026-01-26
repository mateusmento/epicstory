<script setup lang="tsx">
import { Button, Drawer, DrawerContent, DrawerDescription, DrawerTitle, Separator } from "@/design-system";
import { cn } from "@/design-system/utils";
import { useMessageThread } from "@/domain/channels/composables/message-thread";
import type { IMessage } from "@/domain/channels/types";
import MessageGroup from "./MessageGroup.vue";
import MessageWriter from "./MessageWriter.vue";
import { watch } from "vue";
import MessageActions from "./MessageActions.vue";

defineProps<{
  meId: number;
}>();

const isOpen = defineModel<boolean>("open", { required: true });
const message = defineModel<IMessage>("message", { required: true });

const emit = defineEmits(["message-deleted"]);

const {
  replies,
  replyContent,
  toggleReaction,
  toggleReplyReaction,
  fetchReplies,
  sendReply,
  deleteMessage,
  deleteReply,
} = useMessageThread(message);

watch(isOpen, (open) => {
  if (open && replies.value.length === 0) {
    replies.value = [];
    fetchReplies();
  }
});

function onDeleteMessage() {
  deleteMessage();
  emit("message-deleted", message.value?.id);
}
</script>

<template>
  <Drawer v-model:open="isOpen" direction="right">
    <DrawerContent class="flex:col-2xl bg-white p-6 m-2 min-w-96">
      <DrawerTitle>
        Thread
      </DrawerTitle>

      <MessageGroup :sender="message.sender" :meId="meId" :sentAt="message.sentAt">
        <div class="flex:col relative group/message">
          <DrawerDescription class="text-foreground" :class="styles.messageBox">
            {{ message.content }}
          </DrawerDescription>

          <MessageActions :meId="meId" :senderId="message.senderId" @message-deleted="onDeleteMessage"
            @emoji-selected="toggleReaction($event)" />

          <div class="flex:row-md z-10 flex:center-y ml-lg mt-1 mb-1">
            <Button v-for="reaction in message.reactions" :key="reaction.emoji" variant="outline" size="icon"
              @click="toggleReaction(reaction.emoji)"
              class="border py-0.5 px-2 pr-3 rounded-full border-color-[#686870] bg-white text-sm font-lato text-[#686870]">
              {{ reaction.emoji }} {{ reaction.reactedBy?.length }}
            </Button>
          </div>
        </div>
      </MessageGroup>

      <div class="flex:row-lg flex:center-y">
        <Separator class="flex-1" />
        <span v-if="replies.length === 0" class="text-sm text-secondary-foreground">No replies yet</span>
        <span v-else class="text-sm text-secondary-foreground">
          {{ replies.length }} {{ replies.length === 1 ? 'reply' : 'replies' }}
        </span>
        <Separator class="flex-1" />
      </div>

      <div class="flex:col-xl">
        <div v-for="reply in replies" :key="reply.id" class="flex:row-lg flex:center-y">

          <MessageGroup :sender="reply.sender" :meId="meId" :sentAt="reply.sentAt">
            <div class="flex:col relative group/message">
              <div :class="styles.messageBox">{{ reply.content }}</div>

              <MessageActions :meId="meId" :senderId="reply.senderId" @message-deleted="deleteReply(reply.id)"
                @emoji-selected="toggleReplyReaction(reply.id, $event)" />

              <div class="flex:row-md z-10 flex:center-y ml-lg mt-1 mb-1">
                <Button v-for="reaction in reply.reactions" :key="reaction.emoji" variant="outline" size="icon"
                  @click="toggleReplyReaction(reply.id, reaction.emoji)"
                  class="border py-0.5 px-2 pr-3 rounded-full border-color-[#686870] bg-white text-sm font-lato text-[#686870]">
                  {{ reaction.emoji }} {{ reaction.reactedBy?.length }}
                </Button>
              </div>
            </div>
          </MessageGroup>

        </div>
      </div>

      <MessageWriter v-model:message-content="replyContent" @send-message="sendReply()" class="mt-auto" />
    </DrawerContent>
  </Drawer>
</template>

<script lang="tsx">
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
