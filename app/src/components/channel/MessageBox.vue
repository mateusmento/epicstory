<script setup lang="ts">
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
import { ref, watch } from "vue";
import type { IMessage, IReply } from "@/domain/channels";
import MessageActions from "./MessageActions.vue";
import { IconReplies } from "@/design-system/icons";
import MentionedText from "./MentionedText.vue";
import RichMessageContent from "./RichMessageContent.vue";

defineProps<{
  message: IMessage | IReply;
  meId: number;
  hideRepliesCount?: boolean;
}>();

const emit = defineEmits<{
  (e: "message-deleted"): void;
  (e: "discussion-opened"): void;
  (e: "reaction-toggled", emoji: string): void;
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
</script>

<template>
  <div class="flex:col">
    <HoverCard :open-delay="100" :close-delay="0">
      <HoverCardTrigger as-child>
        <div :class="styles.messageBox" ref="messageBoxRef">
          <RichMessageContent v-if="message.contentRich" :contentRich="message.contentRich" />
          <MentionedText v-else :content="message.content" :mentioned-users="message.mentionedUsers" />
        </div>
      </HoverCardTrigger>
      <HoverCardContent as-child side="top" align="start" :align-offset="alignOffset" :side-offset="-10">
        <MessageActions
          :meId="meId"
          :senderId="message.senderId"
          @message-deleted="emit('message-deleted')"
          @toggle-discussion="emit('discussion-opened')"
          @emoji-selected="emit('reaction-toggled', $event)"
          ref="messageActionsRef"
        />
      </HoverCardContent>
    </HoverCard>

    <div
      v-if="(!hideRepliesCount && message.repliesCount > 0) || message.reactions.length > 0"
      class="flex:row-2xl flex:center-y ml-lg mt-1 mb-1 z-10"
    >
      <Button
        v-if="!hideRepliesCount && message.repliesCount > 0"
        variant="ghost"
        size="icon"
        @click="emit('discussion-opened')"
      >
        <img
          v-for="replier in message.repliers"
          :key="replier.user.id"
          :src="replier.user.picture"
          class="w-6 h-6 -ml-2 first:ml-0 rounded-full"
        />

        <span class="flex:row-md flex:center-y ml-xl text-xs text-primary/40">
          <IconReplies class="w-5 h-5 text-primary/40" />
          {{ message.repliesCount }} replies
        </span>
      </Button>

      <div v-if="message.reactions.length > 0" class="flex:row-md flex:center-y">
        <Tooltip
          v-for="reaction in message.reactions"
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
