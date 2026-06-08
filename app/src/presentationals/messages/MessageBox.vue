<script setup lang="ts">
import { RichTextPreview } from "@/presentationals/rich-text";
import { UserAvatar } from "@/presentationals/user";
import {
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Menu,
  MenuContent,
  MenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system";
import { Icon } from "@/design-system/icons";
import { cn } from "@/design-system/utils";
import { TIPTAP_MESSAGE_BOX_QUOTE_EXCERPT_MAX, type IMessage, type IReply } from "@epicstory/contracts";
import {
  excludeInlineImageAttachmentsFromBubbleTiles,
  messageBodyPlainText,
  truncatePlainText,
} from "@epicstory/tiptap";
import { computed, ref, watch } from "vue";
import ChannelPollPreview from "./ChannelPollPreview.vue";
import MessageActions from "./MessageActions.vue";
import MessageAttachments from "./MessageAttachments.vue";
import MessageContextMenu from "./MessageContextMenu.vue";

const props = withDefaults(
  defineProps<{
    message: IMessage | IReply;
    meId: number;
    hideRepliesCount?: boolean;
    /** Thread root should not be quotable as a reply-to-reply reference. */
    allowQuote?: boolean;
    pollVotingOptionId?: string | null;
  }>(),
  { allowQuote: true, pollVotingOptionId: null },
);

const emit = defineEmits<{
  (e: "message-deleted"): void;
  (e: "discussion-opened"): void;
  (e: "reaction-toggled", emoji: string): void;
  (e: "quote", message: IMessage | IReply): void;
  (e: "edit", message: IMessage | IReply): void;
  (e: "poll-voted", optionId: string): void;
}>();

const messageActionsRef = ref<InstanceType<typeof MessageActions>>();
const messageBoxRef = ref<HTMLElement | null>(null);

const alignOffset = ref(20);

watch([messageBoxRef, messageActionsRef], ([messageBoxEl, messageActionsEl]) => {
  const defaultMargin = 24;

  if (!messageBoxEl || !messageActionsEl) {
    alignOffset.value = defaultMargin;
    return;
  }

  const messageActionsWidth = messageActionsEl.getWidth();
  if (!messageActionsWidth) {
    alignOffset.value = defaultMargin;
    return;
  }

  if (messageBoxEl.clientWidth < messageActionsWidth) alignOffset.value = defaultMargin;
  else alignOffset.value = messageBoxEl.clientWidth - messageActionsWidth - defaultMargin;
});

const quotedExcerpt = computed(() => {
  const q = props.message.quotedMessage;
  if (!q) return "";
  const raw = q.displayContent ?? messageBodyPlainText(q);
  return truncatePlainText(raw, TIPTAP_MESSAGE_BOX_QUOTE_EXCERPT_MAX);
});

/** Omit attachment tiles already rendered inline in the body (listing APIs still return full set). */
const bubbleAttachmentTiles = computed(() =>
  excludeInlineImageAttachmentsFromBubbleTiles(props.message.content, props.message.attachments ?? []),
);

function reactionPillClass(reaction: (typeof props.message.reactions)[number]) {
  return cn(
    "border py-0.5 px-2 pr-3 rounded-full text-sm font-lato transition-colors",
    reaction.reactedByMe || reaction.reactedBy.some((u) => u.id === props.meId)
      ? "border-primary/50 bg-primary/10 text-primary font-medium"
      : "border-border bg-card text-muted-foreground",
  );
}
</script>

<template>
  <div class="flex:col">
    <div
      v-if="props.message.quotedMessage"
      class="flex flex-row gap-2 items-stretch border-0 my-2 ml-3 rounded-md text-muted-foreground/90"
    >
      <Icon name="fa-quote-right" class="size-4 self-start mt-0.5" />
      <div class="min-w-0 flex-1 text-sm">
        <span class="font-medium text-foreground/80">{{ props.message.quotedMessage.sender.name }}</span>
        <p class="line-clamp-4 whitespace-pre-wrap">{{ quotedExcerpt }}</p>
      </div>
    </div>
    <HoverCard :open-delay="100" :close-delay="0">
      <Menu type="context-menu">
        <HoverCardTrigger as-child>
          <MenuTrigger as-child>
            <div :class="styles.messageBox" ref="messageBoxRef">
              <RichTextPreview
                :content="props.message.content"
                :mentioned-users="props.message.mentionedUsers"
                :me-id="props.meId"
              />
              <ChannelPollPreview
                v-if="'poll' in props.message && props.message.poll && !('messageId' in props.message)"
                :poll="props.message.poll"
                :voting-option-id="pollVotingOptionId"
                @pick="emit('poll-voted', $event)"
              />
              <MessageAttachments v-if="bubbleAttachmentTiles.length > 0" :files="bubbleAttachmentTiles" />
              <div
                v-if="'isScheduled' in props.message && props.message.isScheduled"
                class="text-[0.65rem] text-muted-foreground/80 mb-0.5"
              >
                (Scheduled)
              </div>
              <div
                v-else-if="'editedAt' in props.message && props.message.editedAt"
                class="text-[0.65rem] text-muted-foreground/80 mb-0.5"
              >
                (edited)
              </div>
            </div>
          </MenuTrigger>
        </HoverCardTrigger>
        <MenuContent class="font-dmSans">
          <MessageContextMenu
            :meId="props.meId"
            :senderId="props.message.senderId"
            :message="props.message"
            :allow-quote="props.allowQuote"
            @message-deleted="emit('message-deleted')"
            @toggle-discussion="emit('discussion-opened')"
            @emoji-selected="emit('reaction-toggled', $event)"
            @quote="emit('quote', props.message)"
            @edit="emit('edit', props.message)"
          />
        </MenuContent>
      </Menu>

      <HoverCardContent as-child side="top" align="start" :align-offset="alignOffset" :side-offset="-10">
        <MessageActions
          :meId="props.meId"
          :senderId="props.message.senderId"
          :message="props.message"
          :allow-quote="props.allowQuote"
          @message-deleted="emit('message-deleted')"
          @toggle-discussion="emit('discussion-opened')"
          @emoji-selected="emit('reaction-toggled', $event)"
          @quote="emit('quote', props.message)"
          @edit="emit('edit', props.message)"
          ref="messageActionsRef"
        />
      </HoverCardContent>
    </HoverCard>

    <div
      v-if="(!props.hideRepliesCount && props.message.repliesCount > 0) || props.message.reactions.length > 0"
      class="flex:row-2xl flex:center-y ml-lg mt-1 mb-1 z-10"
    >
      <Button
        v-if="!props.hideRepliesCount && props.message.repliesCount > 0"
        variant="ghost"
        size="icon"
        class="flex:row-md flex:center-y"
        @click="emit('discussion-opened')"
      >
        <UserAvatar
          v-for="replier in props.message.repliers"
          :key="replier.user.id"
          :name="replier.user.name"
          :picture="replier.user.picture"
          size="md"
          class="-ml-2 first:ml-0"
        />
        <span class="text-xs text-primary/40"> {{ props.message.repliesCount }} replies </span>
      </Button>

      <div v-if="props.message.reactions.length > 0" class="flex:row-md flex:center-y">
        <Tooltip
          v-for="reaction in props.message.reactions"
          :key="reaction.emoji"
          :default-open="false"
          :ignore-non-keyboard-focus="true"
        >
          <TooltipTrigger as-child>
            <Button
              variant="outline"
              size="icon"
              @click="emit('reaction-toggled', reaction.emoji)"
              :class="reactionPillClass(reaction)"
            >
              {{ reaction.emoji }} {{ reaction.reactedBy.length }}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div class="flex:col flex:center-x max-w-32">
              <div class="text-2xl">{{ reaction.emoji }}</div>
              <p class="text-center text-xs">
                Reacted by
                {{
                  reaction.reactedBy
                    .map((u) => u.name)
                    .filter(Boolean)
                    .join(", ")
                }}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
const styles = {
  messageBox: cn(
    [
      "group",
      "min-w-40 w-full px-3 py-0.5",
      "text-[calc(1rem-1px)] font-lato",
      "rounded-xl",
      "border border-transparent",
      "transition-[border-color,background-color]",
      "data-[state=open]:bg-secondary/20",
      "data-[state=open]:border-border",
      "rounded-tl-none",
    ].join(" "),
  ),
  repliesCount: cn(
    [
      // "flex:row flex:center-y p-1 rounded-lg cursor-pointer",
      // "border border-transparent",
      // "hover:bg-secondary/50 hover:border-secondary",
    ].join(" "),
  ),
};
</script>
