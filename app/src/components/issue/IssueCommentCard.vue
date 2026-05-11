<script lang="ts" setup>
import { emojis } from "@/components/channel/emojis";
import { MessageAttachments } from "@/components/messages";
import { RichTextPreview } from "@/components/rich-text";
import { UserAvatar } from "@/components/user";
import { useDependency } from "@/core/dependency-injection";
import {
  Button,
  Menu,
  MenuContent,
  MenuInput,
  MenuSeparator,
  MenuTrigger,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/design-system";
import { cn } from "@/design-system/utils";
import type { IAggregatedReaction, IMessage, IReply } from "@/domain/channels";
import type { MessageAttachmentDto } from "@/domain/channels/types/message.type";
import { ChannelApi } from "@/domain/channels/services/channel.service";
import { excludeInlineImageAttachmentsFromBubbleTiles } from "@epicstory/tiptap";
import { formatDistanceToNow } from "date-fns";
import { SmilePlusIcon } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import MessageContextDropdown from "../messages/MessageContextDropdown.vue";

const props = withDefaults(
  defineProps<{
    message: IMessage | IReply;
    meId: number;
    variant?: "default" | "threadSegment";
    segmentDivider?: boolean;
    /** When set, overrides `message.attachments` (e.g. issue attachment store). */
    attachments?: MessageAttachmentDto[];
  }>(),
  {
    variant: "default",
    segmentDivider: false,
  },
);

const emit = defineEmits<{
  (e: "message-deleted"): void;
  (e: "emoji-selected", emoji: string): void;
  (e: "toggle-discussion"): void;
  (e: "quote"): void;
  (e: "edit"): void;
}>();

const channelApi = useDependency(ChannelApi);

const reactions = ref<IAggregatedReaction[]>([...(props.message.reactions ?? [])]);
const reacting = ref(false);

watch(
  () => props.message.reactions,
  (r) => {
    reactions.value = [...(r ?? [])];
  },
  { deep: true },
);

const isReplyEntity = computed(() => "messageId" in props.message && props.message.messageId != null);

const rawAttachments = computed(() => props.attachments ?? props.message.attachments ?? []);

const displayAttachments = computed(() =>
  excludeInlineImageAttachmentsFromBubbleTiles(props.message.content, rawAttachments.value),
);

const mostUsedEmojis = ["👍", "🙌", "❤️", "🔥", "🎉"];

function timeLabel(sentAt: string) {
  try {
    return formatDistanceToNow(new Date(sentAt), { addSuffix: true });
  } catch {
    return sentAt;
  }
}

const rmMeId = () => props.meId ?? 0;

function reactedByMe(reaction: IAggregatedReaction) {
  return reaction.reactedByMe || reaction.reactedBy.some((u) => u.id === props.meId);
}

function pillClass(reaction: IAggregatedReaction) {
  return cn(
    "h-8 min-h-8 gap-1 rounded-full border px-2.5 text-[13px] font-medium",
    "text-zinc-600 border-zinc-300 hover:bg-zinc-100 transition-colors",
    reactedByMe(reaction) ? "bg-muted" : "bg-white",
  );
}

async function toggleReaction(emoji: string) {
  if (reacting.value) return;
  reacting.value = true;
  try {
    const { reactions: next } = isReplyEntity.value
      ? await channelApi.toggleReplyReaction(props.message.id, emoji)
      : await channelApi.toggleMessageReaction(props.message.id, emoji);
    reactions.value = next;
  } catch {
    /* non-blocking */
  } finally {
    reacting.value = false;
  }
}

const avatarSize = computed(() => (props.variant === "threadSegment" ? "md" : "base"));

const rootClass = computed(() =>
  props.variant === "threadSegment"
    ? cn("flex gap-3", "px-4 py-3.5", props.segmentDivider ? "border-t border-zinc-200/75" : "")
    : cn(
        "flex gap-3",
        "rounded-lg border border-zinc-200/90 bg-white px-4 py-3.5",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
      ),
);
</script>

<template>
  <MessageContextDropdown
    :message
    :meId
    :senderId="message.sender.id"
    :allow-quote="false"
    @message-deleted="emit('message-deleted')"
    @emoji-selected="toggleReaction($event)"
    @toggle-discussion="emit('toggle-discussion')"
    @quote="emit('quote')"
    @edit="emit('edit')"
  >
    <article :class="rootClass">
      <UserAvatar
        class="shrink-0"
        :name="message.sender.name"
        :picture="message.sender.picture"
        :size="avatarSize"
      />
      <div class="min-w-0 flex-1 flex flex-col gap-1.5">
        <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0">
          <span class="text-[13px] font-semibold leading-tight text-zinc-900">{{ message.sender.name }}</span>
          <time class="text-[12px] tabular-nums font-normal text-zinc-500" :datetime="message.sentAt">
            {{ timeLabel(message.sentAt) }}
          </time>
        </div>
        <div
          class="prose prose-sm max-w-none leading-relaxed text-zinc-800 [&_a]:text-[#4F46E5] [&_a]:no-underline hover:[&_a]:underline [&_.ProseMirror]:outline-none"
        >
          <RichTextPreview
            :content="message.content"
            :mentioned-users="message.mentionedUsers"
            :me-id="rmMeId()"
          />
        </div>
        <MessageAttachments v-if="displayAttachments.length > 0" :files="displayAttachments" />
        <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Tooltip v-for="reaction in reactions" :key="reaction.emoji">
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="sm"
                class="px-0 font-lato"
                :class="pillClass(reaction)"
                :disabled="reacting"
                @click="toggleReaction(reaction.emoji)"
              >
                <span>{{ reaction.emoji }}</span>
                <span class="tabular-nums">{{ reaction.reactedBy.length }}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent class="max-w-xs">
              <div class="flex flex-col items-center gap-1 text-center">
                <span class="text-2xl">{{ reaction.emoji }}</span>
                <p class="text-xs">
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

          <Menu type="dropdown-menu">
            <MenuTrigger as-child>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Add reaction"
                aria-label="Add reaction"
                class="h-8 w-8 shrink-0 rounded-full border-dashed border-zinc-300/90 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                :disabled="reacting"
              >
                <SmilePlusIcon class="size-4" />
              </Button>
            </MenuTrigger>
            <MenuContent align="start" class="z-[90] w-[min(20rem,90vw)] font-dmSans">
              <div class="flex justify-center gap-0.5 py-1">
                <Button
                  v-for="emoji in mostUsedEmojis"
                  :key="emoji"
                  variant="ghost"
                  size="icon"
                  class="size-9 text-lg"
                  :disabled="reacting"
                  @click="toggleReaction(emoji)"
                >
                  {{ emoji }}
                </Button>
              </div>
              <MenuSeparator />
              <MenuInput placeholder="Search emoji…" class="text-base" />
              <MenuSeparator />
              <ScrollArea class="h-72 max-h-[50vh] min-h-0 p-0">
                <div class="grid grid-cols-8 gap-1 p-2">
                  <Button
                    v-for="emoji in emojis"
                    :key="emoji"
                    variant="ghost"
                    size="icon"
                    class="size-10 text-lg"
                    :title="emoji"
                    :disabled="reacting"
                    @click="toggleReaction(emoji)"
                  >
                    {{ emoji }}
                  </Button>
                </div>
              </ScrollArea>
            </MenuContent>
          </Menu>
        </div>
      </div>
    </article>
  </MessageContextDropdown>
</template>
