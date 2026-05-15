<script setup lang="tsx">
import { channelMessageComposerAttachmentHandlers, MessageBox, MessageComposer } from "@/components/messages";
import { useDependency } from "@/core/dependency-injection";
import { Button, ScrollArea, Separator } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { groupMessages, useChannel, useMessageThread } from "@/domain/channels";
import type { IMessageGroup } from "@/domain/channels/types/message.type";
import { ChannelApi } from "@epicstory/api-client";
import type { IMessage, IReply } from "@epicstory/contracts";
import { useVirtualizer } from "@tanstack/vue-virtual";
import type { JSONContent } from "@tiptap/core";
import { useThrottleFn } from "@vueuse/core";
import type { VNodeRef } from "vue";
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import MessageGroup from "./MessageGroup.vue";

defineProps<{ meId: number }>();

const message = defineModel<IMessage>("message", { required: true });

const emit = defineEmits(["message-deleted", "close"]);

const channelApi = useDependency(ChannelApi);
const { channel, deleteMessage, updateMessage } = useChannel();

const composerAttachmentHandlers = computed(() =>
  channelMessageComposerAttachmentHandlers({
    channelApi,
    channelId: () => message.value.channelId,
  }),
);

const {
  replies,
  toggleReaction,
  toggleReplyReaction,
  fetchReplies,
  loadOlderRepliesPage,
  sendReply,
  deleteReply,
  hasMoreOlderReplies,
  loadingOlderReplies,
} = useMessageThread(message, { onMessageDeleted: () => emit("close") });

const replyGroups = computed(() => groupMessages(replies.value));

function groupRowKey(group: IMessageGroup<IReply>) {
  return `g-${group.id}`;
}

function replyGroupAt(index: number): IMessageGroup<IReply> | undefined {
  return replyGroups.value[index];
}

function replyGroupsEndCursor(groups: IMessageGroup<IReply>[]): string | null {
  if (groups.length === 0) return null;
  const last = groups[groups.length - 1];
  const m = last.messages[last.messages.length - 1];
  if (!m) return null;
  return `${new Date(m.sentAt as unknown as string).getTime()}\0${m.id}`;
}

/** In-thread composer only quotes other replies (not the thread root). */
const quotedMessage = ref<IReply | null>(null);
const editingMessage = ref<IMessage | null>(null);

watch([replies, quotedMessage], ([list, q]) => {
  if (!q) return;
  if (!list.some((r) => r.id === q.id)) {
    quotedMessage.value = null;
  }
});

const scrollAreaRef = ref<InstanceType<typeof ScrollArea> | null>(null);

const threadHeaderEl = ref<HTMLElement | null>(null);
const threadHeaderHeight = ref(0);
let headerResizeObserver: ResizeObserver | null = null;

watch(
  threadHeaderEl,
  (el) => {
    headerResizeObserver?.disconnect();
    headerResizeObserver = null;
    if (!el) {
      threadHeaderHeight.value = 0;
      return;
    }
    const ro = new ResizeObserver(() => {
      threadHeaderHeight.value = Math.round(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    threadHeaderHeight.value = Math.round(el.getBoundingClientRect().height);
    headerResizeObserver = ro;
  },
  { flush: "post" },
);

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: replyGroups.value.length,
    getScrollElement: () => scrollAreaRef.value?.getScrollElement() ?? null,
    estimateSize: () => 120,
    overscan: 6,
    paddingStart: threadHeaderHeight.value,
    scrollPaddingStart: threadHeaderHeight.value,
    getItemKey: (index: number) => {
      const g = replyGroups.value[index];
      return g ? groupRowKey(g) : index;
    },
  })),
);

const measureReplyGroupRow: VNodeRef = (el) => {
  rowVirtualizer.value.measureElement(el as HTMLElement | null);
};

const prependBusy = ref(false);

async function loadOlderRepliesWithScrollPreserve() {
  if (prependBusy.value || !hasMoreOlderReplies.value || loadingOlderReplies.value) return;
  prependBusy.value = true;
  const el = scrollAreaRef.value?.getScrollElement();
  if (!el) {
    prependBusy.value = false;
    return;
  }
  const prevScrollHeight = el.scrollHeight;
  const prevScrollTop = el.scrollTop;
  try {
    await loadOlderRepliesPage();
  } finally {
    await nextTick();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const v = scrollAreaRef.value?.getScrollElement();
        if (v) {
          v.scrollTop = prevScrollTop + (v.scrollHeight - prevScrollHeight);
        }
        prependBusy.value = false;
      });
    });
  }
}

const NEAR_TOP_PX = 200;

const onViewportScroll = useThrottleFn(() => {
  const el = scrollAreaRef.value?.getScrollElement();
  if (!el || el.scrollTop > NEAR_TOP_PX) return;
  if (!hasMoreOlderReplies.value || loadingOlderReplies.value || prependBusy.value) return;
  loadOlderRepliesWithScrollPreserve();
}, 100);

watch(
  scrollAreaRef,
  (area, prev) => {
    const prevEl = prev?.getScrollElement?.() ?? null;
    if (prevEl) prevEl.removeEventListener("scroll", onViewportScroll);
    const nextEl = area?.getScrollElement?.() ?? null;
    if (nextEl) nextEl.addEventListener("scroll", onViewportScroll, { passive: true });
  },
  { immediate: true },
);

onUnmounted(() => {
  headerResizeObserver?.disconnect();
  scrollAreaRef.value?.getScrollElement?.()?.removeEventListener("scroll", onViewportScroll);
});

watch(
  () => message.value.id,
  () => fetchReplies(),
  { immediate: true },
);

const prevReplyGroupCount = ref(-1);
const prevReplyEndCursor = ref<string | null>(null);

watch(
  () => message.value.id,
  () => {
    prevReplyGroupCount.value = -1;
    prevReplyEndCursor.value = null;
  },
);

watch(
  () => replyGroups.value.length,
  (n) => {
    const endCur = replyGroupsEndCursor(replyGroups.value);
    const prev = prevReplyGroupCount.value;
    if (prev < 0) {
      prevReplyGroupCount.value = n;
      prevReplyEndCursor.value = endCur;
      if (n > 0) nextTick(() => scrollAreaRef.value?.scrollToBottom());
      return;
    }
    if (n > prev) {
      const prevEnd = prevReplyEndCursor.value;
      prevReplyGroupCount.value = n;
      prevReplyEndCursor.value = endCur;
      if (endCur !== prevEnd) {
        nextTick(() => scrollAreaRef.value?.scrollToBottom());
      }
    } else {
      prevReplyGroupCount.value = n;
      prevReplyEndCursor.value = endCur;
    }
  },
);

async function onMessageDeleted() {
  deleteMessage(message.value.id);
  emit("close");
}

async function onSendReply(payload: {
  content: JSONContent;
  quotedMessageId?: number;
  quotedReplyId?: number;
  attachmentIds?: number[];
}) {
  await sendReply({
    content: payload.content,
    quotedReplyId: payload.quotedReplyId,
    attachmentIds: payload.attachmentIds,
  });
  scrollAreaRef.value?.scrollToBottom();
  quotedMessage.value = null;
}

async function onSubmitEdit(payload: { messageId: number; content: JSONContent; attachmentIds?: number[] }) {
  const updated = await updateMessage(payload.messageId, {
    content: payload.content,
    ...(payload.attachmentIds != null && payload.attachmentIds.length > 0
      ? { attachmentIds: payload.attachmentIds }
      : {}),
  });
  if (message.value.id === payload.messageId) {
    Object.assign(message.value, updated);
  }
  editingMessage.value = null;
}

function onQuoteTarget(m: IMessage | IReply) {
  if (!("messageId" in m) || m.messageId == null) return;
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

    <ScrollArea class="flex-1 min-h-0" ref="scrollAreaRef">
      <div class="flex:col-2xl !flex p-4 min-w-96 min-h-full bg-white">
        <div
          class="w-full"
          :style="{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }"
        >
          <div ref="threadHeaderEl" class="flex:col-2xl absolute left-0 right-0 top-0 z-[1] bg-white">
            <MessageGroup :sender="message.sender" :meId="meId" :sentAt="message.sentAt">
              <MessageBox
                :message="message"
                :meId="meId"
                :allow-quote="false"
                @reaction-toggled="toggleReaction($event)"
                @message-deleted="onMessageDeleted"
                @quote="onQuoteTarget"
                @edit="onEditTarget"
                hide-replies-count
              />
            </MessageGroup>

            <div class="flex:row-lg flex:center-y">
              <Separator class="flex-1" />
              <span v-if="message.repliesCount === 0" class="text-sm text-secondary-foreground"
                >No replies yet</span
              >
              <span v-else class="text-sm text-secondary-foreground">
                {{ message.repliesCount }}
                {{ message.repliesCount === 1 ? "reply" : "replies" }}
              </span>
              <Separator class="flex-1" />
            </div>
          </div>

          <div
            v-for="virtualRow in rowVirtualizer.getVirtualItems()"
            :key="groupRowKey(replyGroupAt(virtualRow.index)!)"
            :data-index="virtualRow.index"
            :ref="measureReplyGroupRow"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }"
          >
            <MessageGroup
              v-if="replyGroupAt(virtualRow.index)"
              :sender="replyGroupAt(virtualRow.index)!.sender"
              :meId="meId"
              :sentAt="replyGroupAt(virtualRow.index)!.sentAt"
            >
              <MessageBox
                v-for="reply in replyGroupAt(virtualRow.index)!.messages"
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
      </div>
    </ScrollArea>

    <MessageComposer
      :channel-id="message.channelId"
      :attachment-handlers="composerAttachmentHandlers"
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
