<script setup lang="ts">
import { UserAvatar } from "@/components/user";
import {
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system";
import { cn } from "@/design-system/utils";
import type { IMessage, IReply } from "@/domain/channels";
import { messageBodyPlainText } from "@epicstory/tiptap";
import { computed, ref, watch } from "vue";
import MentionedText from "./MentionedText.vue";
import MessageActions from "./MessageActions.vue";
import RichMessageContent from "./RichMessageContent.vue";

const props = defineProps<{
  message: IMessage | IReply;
  meId: number;
  hideRepliesCount?: boolean;
}>();

const emit = defineEmits<{
  (e: "message-deleted"): void;
  (e: "discussion-opened"): void;
  (e: "reaction-toggled", emoji: string): void;
  (e: "quote", message: IMessage | IReply): void;
  (e: "edit", message: IMessage | IReply): void;
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
  const t = messageBodyPlainText(q).replace(/\s+/g, " ").trim();
  return t.length > 220 ? `${t.slice(0, 220)}…` : t;
});
</script>

<template>
  <div class="flex:col my-2">
    <div
      v-if="props.message.quotedMessage"
      class="mb-1 ml-0 pl-2 border-zinc-300 rounded-md bg-zinc-100 py-1.5 text-xs text-muted-foreground"
    >
      <span class="font-medium text-foreground/85">{{ props.message.quotedMessage.sender.name }}</span>
      <p class="mt-0.5 line-clamp-4 whitespace-pre-wrap">{{ quotedExcerpt }}</p>
    </div>
    <HoverCard :open-delay="100" :close-delay="0">
      <HoverCardTrigger as-child>
        <div :class="styles.messageBox" ref="messageBoxRef">
          <RichMessageContent
            v-if="props.message.contentRich"
            :contentRich="props.message.contentRich"
            :mentioned-users="props.message.mentionedUsers"
          />
          <MentionedText
            v-else
            :content="props.message.content"
            :mentioned-users="props.message.mentionedUsers"
          />
          <div
            v-if="'editedAt' in props.message && props.message.editedAt"
            class="text-[0.65rem] text-muted-foreground/80 mt-0.5"
          >
            (edited)
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent as-child side="top" align="start" :align-offset="alignOffset" :side-offset="-10">
        <MessageActions
          :meId="props.meId"
          :senderId="props.message.senderId"
          :message="props.message"
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
              class="border py-0.5 px-2 pr-3 rounded-full border-color-[#686870] bg-white text-sm font-lato text-[#686870]"
            >
              {{ reaction.emoji }} {{ reaction.reactedBy.length }}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div class="flex:col flex:center-x max-w-32">
              <div class="text-2xl">{{ reaction.emoji }}</div>
              <p class="text-center">
                Reacted by
                <span v-for="user in reaction.reactedBy" :key="user.id">
                  {{ user.name }}<span v-if="!reaction.reactedBy.slice(-1).includes(user)">, </span>
                </span>
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
      "min-w-40 w-full px-3 py-1.5",
      "text-[calc(1rem-1px)] font-lato",
      "rounded-xl",
      "border border-transparent",
      "transition-[border-color,background-color]",
      "data-[state=open]:bg-secondary/20",
      "data-[state=open]:border-[#E4E4E4]",
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
