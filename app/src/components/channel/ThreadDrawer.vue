<script setup lang="tsx">
import { mergeQuotedMessageIntoDoc, normalizeTiptapDoc, tiptapToPlainText } from "@epicstory/tiptap";
import { Button, ScrollArea, Separator } from "@/design-system";
import { Icon } from "@/design-system/icons";
import type { IMessage, IMessageGroup, IReply } from "@/domain/channels";
import { useChannel } from "@/domain/channels";
import { useMessageThread } from "@/domain/channels/composables/message-thread";
import { last } from "lodash";
import { computed, onMounted, ref } from "vue";
import MessageBox from "./MessageBox.vue";
import MessageGroup from "./MessageGroup.vue";
import MessageWriter from "./MessageWriter.vue";

defineProps<{ meId: number }>();

const message = defineModel<IMessage>("message", { required: true });

const emit = defineEmits(["message-deleted", "close"]);

const { replies, toggleReaction, toggleReplyReaction, fetchReplies, sendReply, deleteReply } =
  useMessageThread(message, { onMessageDeleted: () => emit("close"), name: "thread" });

const { channel, deleteMessage, updateMessage } = useChannel();

const quotedMessage = ref<IMessage | IReply | null>(null);
const editingMessage = ref<IMessage | null>(null);

function groupMessages(messages: IReply[]) {
  return messages.reduce((groups, message) => {
    const lastGroup = last(groups);
    if (lastGroup && message.senderId === lastGroup.senderId) {
      lastGroup.messages.push(message);
    } else {
      groups.push({
        id: message.id,
        senderId: message.senderId,
        sender: message.sender,
        sentAt: message.sentAt,
        messages: [message],
      });
    }
    return groups;
  }, [] as IMessageGroup<IReply>[]);
}

const replyGroups = computed(() => {
  return groupMessages(replies.value);
});

onMounted(() => {
  fetchReplies();
});

async function onMessageDeleted() {
  deleteMessage(message.value.id);
  emit("close");
}

async function onSendReply(payload: { content: string; contentRich: any }) {
  const rich = quotedMessage.value
    ? mergeQuotedMessageIntoDoc(quotedMessage.value, payload.contentRich)
    : payload.contentRich;
  const plain = tiptapToPlainText(normalizeTiptapDoc(rich));
  await sendReply({ content: plain, contentRich: rich });
  quotedMessage.value = null;
}

async function onSubmitEdit(payload: { messageId: number; content: string; contentRich: any }) {
  const updated = await updateMessage(payload.messageId, {
    content: payload.content,
    contentRich: payload.contentRich,
  });
  if (message.value.id === payload.messageId) {
    Object.assign(message.value, updated);
  }
  editingMessage.value = null;
}

function onQuoteTarget(m: IMessage | IReply) {
  quotedMessage.value = m;
  editingMessage.value = null;
}

function onEditTarget(m: IMessage | IReply) {
  if ("messageId" in m && m.messageId != null) return;
  editingMessage.value = m;
  quotedMessage.value = null;
}
</script>

<template>
  <div class="flex:col max-w-[32rem] border-l border-l-zinc-300/60">
    <div class="flex:row-xl flex:center-y justify-between h-10 p-4">
      <div class="text-base font-semibold">Thread</div>

      <Button variant="ghost" size="icon" @click="emit('close')">
        <Icon name="io-close" />
      </Button>
    </div>

    <Separator />

    <ScrollArea class="flex-1 min-h-0" bottom>
      <div class="flex:col-2xl !flex p-4 min-w-96 min-h-full bg-white">
        <MessageGroup :sender="message.sender" :meId="meId" :sentAt="message.sentAt">
          <MessageBox
            :message="message"
            :meId="meId"
            @reaction-toggled="toggleReaction($event)"
            @message-deleted="onMessageDeleted"
            @quote="onQuoteTarget"
            @edit="onEditTarget"
            hide-replies-count
          />
        </MessageGroup>

        <div class="flex:row-lg flex:center-y">
          <Separator class="flex-1" />
          <span v-if="replies.length === 0" class="text-sm text-secondary-foreground">No replies yet</span>
          <span v-else class="text-sm text-secondary-foreground">
            {{ replies.length }} {{ replies.length === 1 ? "reply" : "replies" }}
          </span>
          <Separator class="flex-1" />
        </div>

        <div class="flex:col-xl">
          <MessageGroup
            v-for="group in replyGroups"
            :key="group.id"
            :sender="group.sender"
            :meId="meId"
            :sentAt="group.sentAt"
          >
            <MessageBox
              v-for="reply in group.messages"
              :key="reply.id"
              :message="reply"
              :meId="meId"
              @reaction-toggled="toggleReplyReaction(reply.id, $event)"
              @message-deleted="deleteReply(reply.id)"
              @quote="onQuoteTarget"
              @edit="onEditTarget"
            />
          </MessageGroup>
        </div>
      </div>
    </ScrollArea>

    <MessageWriter
      :mentionables="channel?.peers ?? []"
      :me-id="meId"
      :quoted-message="quotedMessage"
      :editing-message="editingMessage"
      @send-message="onSendReply"
      @submit-edit="onSubmitEdit"
      @clear-quote="quotedMessage = null"
      @cancel-edit="editingMessage = null"
      class="m-4 mt-auto"
    />
  </div>
</template>
